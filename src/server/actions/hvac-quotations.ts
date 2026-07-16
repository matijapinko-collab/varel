"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, requireTenantRole, logActivity, FINANCIAL_ROLES } from "@/lib/hvac/tenant";
import { nextDocNumber } from "@/lib/hvac/numbering";
import { lineTotals, documentTotals, publicDocToken } from "@/lib/hvac/documents";
import { sendEmail } from "@/lib/email";
import { quotationEmail } from "@/lib/hvac/document-emails";
import { fd, fdNum, ActionError } from "./helpers";
import type { HvacQuoteStatus } from "@/generated/prisma/client";

/** Converted quotes are frozen — they produced a work order or an invoice. */
const LOCKED: HvacQuoteStatus[] = ["CONVERTED_WORKORDER", "CONVERTED_INVOICE"];

async function loadEditable(id: string, tenantId: string) {
  const q = await db.hvacQuotation.findFirst({ where: { id, tenantId } });
  if (!q) throw new ActionError("Ponuda nije pronađena.");
  if (LOCKED.includes(q.status)) throw new ActionError("Ponuda je pretvorena i ne može se mijenjati.");
  return q;
}

async function recomputeTotals(quotationId: string) {
  const items = await db.hvacQuotationItem.findMany({ where: { quotationId } });
  const totals = documentTotals(items.map((i) => ({
    totalEur: Number(i.totalEur), vatPct: Number(i.vatPct), quantity: Number(i.quantity), unitPriceEur: Number(i.unitPriceEur), discountPct: Number(i.discountPct),
  })));
  await db.hvacQuotation.update({ where: { id: quotationId }, data: totals });
}

export async function createQuotation(form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const customerId = fd(form, "customerId");
  if (!customerId) throw new ActionError("Odaberite klijenta.");
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) throw new ActionError("Klijent nije pronađen.");

  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { quoteValidityDays: true } });
  const validDays = settings?.quoteValidityDays ?? 30;
  const validUntil = new Date(Date.now() + validDays * 86400000);

  const q = await db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, ctx.tenantId, "QUOTATION");
    return tx.hvacQuotation.create({
      data: {
        tenantId: ctx.tenantId, number, customerId,
        locationId: fd(form, "locationId") || null,
        status: "DRAFT", validUntil,
        notes: fd(form, "notes") || null,
        paymentTerms: fd(form, "paymentTerms") || null,
        workOrderId: fd(form, "workOrderId") || null,
      },
    });
  });
  await logActivity(ctx, "quotation_created", "quotation", q.id);
  redirect(`/hvac-b2b/ponude/${q.id}`);
}

export async function updateQuotation(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  await loadEditable(id, ctx.tenantId);
  const validRaw = fd(form, "validUntil");
  await db.hvacQuotation.update({
    where: { id },
    data: {
      locationId: fd(form, "locationId") || null,
      validUntil: validRaw ? new Date(validRaw) : null,
      notes: fd(form, "notes") || null,
      paymentTerms: fd(form, "paymentTerms") || null,
    },
  });
  await logActivity(ctx, "quotation_updated", "quotation", id);
  revalidatePath(`/hvac-b2b/ponude/${id}`);
}

export async function addQuotationItem(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  await loadEditable(id, ctx.tenantId);
  const description = fd(form, "description");
  if (!description) throw new ActionError("Unesite opis stavke.");
  const quantity = fdNum(form, "quantity") ?? 1;
  const unitPriceEur = fdNum(form, "unitPriceEur") ?? 0;
  const discountPct = fdNum(form, "discountPct") ?? 0;
  // A company outside the VAT system must never charge VAT.
  const vatPct = ctx.tenant.vatRegistered ? (fdNum(form, "vatPct") ?? 25) : 0;
  const t = lineTotals({ quantity, unitPriceEur, discountPct, vatPct });
  const count = await db.hvacQuotationItem.count({ where: { quotationId: id } });
  await db.hvacQuotationItem.create({
    data: {
      tenantId: ctx.tenantId, quotationId: id, description,
      quantity, unit: fd(form, "unit") || "kom", unitPriceEur, discountPct, vatPct,
      totalEur: t.total, position: count,
    },
  });
  await recomputeTotals(id);
  revalidatePath(`/hvac-b2b/ponude/${id}`);
}

export async function removeQuotationItem(itemId: string, quotationId: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  await loadEditable(quotationId, ctx.tenantId);
  await db.hvacQuotationItem.deleteMany({ where: { id: itemId, tenantId: ctx.tenantId, quotationId } });
  await recomputeTotals(quotationId);
  revalidatePath(`/hvac-b2b/ponude/${quotationId}`);
}

export async function setQuotationStatus(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const q = await db.hvacQuotation.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!q) throw new ActionError("Ponuda nije pronađena.");
  const status = fd(form, "status") as HvacQuoteStatus;
  await db.hvacQuotation.update({
    where: { id },
    data: { status, acceptedAt: status === "ACCEPTED" ? new Date() : q.acceptedAt },
  });
  await logActivity(ctx, "quotation_status", "quotation", id, { status });
  revalidatePath(`/hvac-b2b/ponude/${id}`);
}

export async function sendQuotation(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const q = await db.hvacQuotation.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { customer: true } });
  if (!q) throw new ActionError("Ponuda nije pronađena.");
  const token = q.publicToken ?? publicDocToken();
  await db.hvacQuotation.update({
    where: { id },
    data: { publicToken: token, status: q.status === "DRAFT" ? "SENT" : q.status, sentAt: new Date() },
  });

  if (q.customer.email) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://varel.io";
    const mail = quotationEmail({
      tenantName: ctx.tenant.name,
      customerName: q.customer.companyName || [q.customer.firstName, q.customer.lastName].filter(Boolean).join(" "),
      number: q.number,
      totalEur: Number(q.totalEur),
      validUntil: q.validUntil,
      link: `${base}/hvac-b2b/dokument/${token}`,
    });
    await sendEmail({ to: q.customer.email, subject: mail.subject, text: mail.text, replyTo: ctx.tenant.email || undefined });
  }
  await logActivity(ctx, "quotation_sent", "quotation", id);
  revalidatePath(`/hvac-b2b/ponude/${id}`);
}

export async function convertQuotationToInvoice(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const q = await db.hvacQuotation.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { items: { orderBy: { position: "asc" } }, customer: true } });
  if (!q) throw new ActionError("Ponuda nije pronađena.");
  if (q.invoiceId) redirect(`/hvac-b2b/racuni/${q.invoiceId}`);

  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { defaultPaymentTermsDays: true } });
  const dueDate = new Date(Date.now() + (settings?.defaultPaymentTermsDays ?? 15) * 86400000);

  const invoice = await db.$transaction(async (tx) => {
    // Draft invoice keeps a placeholder number; the real RAC number is
    // allocated only when it is issued (gapless issued-invoice numbering).
    const number = `NACRT-${randomBytes(4).toString("hex")}`;
    const inv = await tx.hvacInvoice.create({
      data: {
        tenantId: ctx.tenantId, number, customerId: q.customerId,
        oib: q.customer.oib, billingAddress: [q.customer.billingAddress, [q.customer.billingPostalCode, q.customer.billingCity].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
        status: "DRAFT", dueDate, quotationId: q.id,
        subtotalEur: q.subtotalEur, vatEur: q.vatEur, totalEur: q.totalEur,
      },
    });
    for (const it of q.items) {
      const net = Number(it.quantity) * Number(it.unitPriceEur) * (1 - Number(it.discountPct) / 100);
      await tx.hvacInvoiceItem.create({
        data: {
          tenantId: ctx.tenantId, invoiceId: inv.id, description: it.description,
          quantity: it.quantity, unit: it.unit, unitPriceEur: Math.round(net / Number(it.quantity || 1) * 100) / 100,
          vatPct: it.vatPct, totalEur: it.totalEur, position: it.position,
        },
      });
    }
    await tx.hvacQuotation.update({ where: { id: q.id }, data: { status: "CONVERTED_INVOICE", invoiceId: inv.id } });
    return inv;
  });
  await logActivity(ctx, "quotation_converted_invoice", "invoice", invoice.id, { quotationId: q.id });
  redirect(`/hvac-b2b/racuni/${invoice.id}`);
}

export async function deleteQuotation(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const q = await db.hvacQuotation.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!q) throw new ActionError("Ponuda nije pronađena.");
  if (q.status !== "DRAFT") throw new ActionError("Samo nacrt ponude može se obrisati.");
  await db.hvacQuotation.delete({ where: { id } });
  await logActivity(ctx, "quotation_deleted", "quotation", id);
  redirect("/hvac-b2b/ponude");
}
