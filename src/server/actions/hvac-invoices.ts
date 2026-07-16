"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantRole, logActivity, logAudit, FINANCIAL_ROLES } from "@/lib/hvac/tenant";
import { nextDocNumber } from "@/lib/hvac/numbering";
import { lineTotals, documentTotals, publicDocToken } from "@/lib/hvac/documents";
import { sendEmail } from "@/lib/email";
import { invoiceEmail } from "@/lib/hvac/document-emails";
import { fd, fdNum, ActionError } from "./helpers";
import type { HvacInvoiceStatus, HvacPaymentMethod } from "@/generated/prisma/client";

/** DRAFT invoices are editable; once ISSUED the document is legally frozen. */
function assertDraft(status: HvacInvoiceStatus) {
  if (status !== "DRAFT") throw new ActionError("Izdani račun se ne može mijenjati.");
}

const draftNumber = () => `NACRT-${randomBytes(4).toString("hex")}`;

async function recomputeTotals(invoiceId: string) {
  const items = await db.hvacInvoiceItem.findMany({ where: { invoiceId } });
  const totals = documentTotals(items.map((i) => ({ totalEur: Number(i.totalEur), vatPct: Number(i.vatPct), quantity: Number(i.quantity), unitPriceEur: Number(i.unitPriceEur) })));
  await db.hvacInvoice.update({ where: { id: invoiceId }, data: totals });
}

/** Recomputes payment status from the sum of recorded payments. */
async function recomputePaymentStatus(invoiceId: string) {
  const inv = await db.hvacInvoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
  if (!inv || inv.status === "DRAFT" || inv.status === "CANCELLED") return;
  const paid = inv.payments.reduce((s, p) => s + Number(p.amountEur), 0);
  const total = Number(inv.totalEur);
  let status: HvacInvoiceStatus;
  if (paid >= total - 0.005) status = "PAID";
  else if (paid > 0) status = "PARTIALLY_PAID";
  else status = inv.dueDate && inv.dueDate < new Date() ? "OVERDUE" : "ISSUED";
  await db.hvacInvoice.update({ where: { id: invoiceId }, data: { status, paidAt: status === "PAID" ? new Date() : null } });
}

export async function createInvoice(form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const workOrderId = fd(form, "workOrderId") || null;
  let customerId = fd(form, "customerId");

  let woItems: { description: string; quantity: number; unitPriceEur: number; vatPct: number }[] = [];
  if (workOrderId) {
    const wo = await db.hvacWorkOrder.findFirst({ where: { id: workOrderId, tenantId: ctx.tenantId }, include: { items: { orderBy: { position: "asc" } } } });
    if (!wo) throw new ActionError("Radni nalog nije pronađen.");
    customerId = wo.customerId;
    const rate = Number((await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { invoiceVatRate: true } }))?.invoiceVatRate ?? 25);
    const vatPct = ctx.tenant.vatRegistered ? rate : 0;
    woItems = wo.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPriceEur: Number(i.unitPriceEur), vatPct }));
  }
  if (!customerId) throw new ActionError("Odaberite klijenta.");
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) throw new ActionError("Klijent nije pronađen.");

  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { defaultPaymentTermsDays: true } });
  const dueDate = new Date(Date.now() + (settings?.defaultPaymentTermsDays ?? 15) * 86400000);

  const inv = await db.hvacInvoice.create({
    data: {
      tenantId: ctx.tenantId, number: draftNumber(), customerId,
      oib: customer.oib,
      billingAddress: [customer.billingAddress, [customer.billingPostalCode, customer.billingCity].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
      status: "DRAFT", dueDate, workOrderId,
    },
  });
  if (woItems.length) {
    await db.hvacInvoiceItem.createMany({
      data: woItems.map((i, idx) => ({
        tenantId: ctx.tenantId, invoiceId: inv.id, description: i.description,
        quantity: i.quantity, unit: "kom", unitPriceEur: i.unitPriceEur, vatPct: i.vatPct,
        totalEur: lineTotals({ quantity: i.quantity, unitPriceEur: i.unitPriceEur, vatPct: i.vatPct }).total, position: idx,
      })),
    });
    await recomputeTotals(inv.id);
  }
  await logActivity(ctx, "invoice_created", "invoice", inv.id, workOrderId ? { from: "work_order" } : undefined);
  redirect(`/hvac-b2b/racuni/${inv.id}`);
}

export async function updateInvoice(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  assertDraft(inv.status);
  const due = fd(form, "dueDate");
  await db.hvacInvoice.update({
    where: { id },
    data: {
      oib: fd(form, "oib") || null,
      billingAddress: fd(form, "billingAddress") || null,
      dueDate: due ? new Date(due) : null,
      paymentMethod: (fd(form, "paymentMethod") || null) as HvacPaymentMethod | null,
      internalNote: fd(form, "internalNote") || null,
      customerNote: fd(form, "customerNote") || null,
    },
  });
  await logActivity(ctx, "invoice_updated", "invoice", id);
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function addInvoiceItem(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  assertDraft(inv.status);
  const description = fd(form, "description");
  if (!description) throw new ActionError("Unesite opis stavke.");
  const quantity = fdNum(form, "quantity") ?? 1;
  const unitPriceEur = fdNum(form, "unitPriceEur") ?? 0;
  // A company outside the VAT system must never charge VAT.
  const vatPct = ctx.tenant.vatRegistered ? (fdNum(form, "vatPct") ?? 25) : 0;
  const count = await db.hvacInvoiceItem.count({ where: { invoiceId: id } });
  await db.hvacInvoiceItem.create({
    data: {
      tenantId: ctx.tenantId, invoiceId: id, description,
      quantity, unit: fd(form, "unit") || "kom", unitPriceEur, vatPct,
      totalEur: lineTotals({ quantity, unitPriceEur, vatPct }).total, position: count,
    },
  });
  await recomputeTotals(id);
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function removeInvoiceItem(itemId: string, invoiceId: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id: invoiceId, tenantId: ctx.tenantId } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  assertDraft(inv.status);
  await db.hvacInvoiceItem.deleteMany({ where: { id: itemId, tenantId: ctx.tenantId, invoiceId } });
  await recomputeTotals(invoiceId);
  revalidatePath(`/hvac-b2b/racuni/${invoiceId}`);
}

export async function issueInvoice(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { items: true } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  if (inv.status !== "DRAFT") throw new ActionError("Račun je već izdan.");
  if (inv.items.length === 0) throw new ActionError("Dodajte barem jednu stavku prije izdavanja.");

  await db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, ctx.tenantId, "INVOICE");
    await tx.hvacInvoice.update({ where: { id }, data: { number, status: "ISSUED", issueDate: new Date() } });
  });
  await logAudit(ctx, "invoice_issued", { entityType: "invoice", entityId: id });
  await logActivity(ctx, "invoice_issued", "invoice", id);
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function recordPayment(id: string, form: FormData) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  if (inv.status === "DRAFT") throw new ActionError("Prvo izdajte račun.");
  if (inv.status === "CANCELLED") throw new ActionError("Račun je otkazan.");
  const amount = fdNum(form, "amountEur");
  if (!amount || amount <= 0) throw new ActionError("Unesite iznos uplate.");
  const paidAtRaw = fd(form, "paidAt");
  await db.hvacPayment.create({
    data: {
      tenantId: ctx.tenantId, invoiceId: id, amountEur: amount,
      method: (fd(form, "method") || "BANK_TRANSFER") as HvacPaymentMethod,
      paidAt: paidAtRaw ? new Date(paidAtRaw) : new Date(),
      note: fd(form, "note") || null,
    },
  });
  await recomputePaymentStatus(id);
  await logActivity(ctx, "payment_recorded", "invoice", id, { amount });
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function removePayment(paymentId: string, invoiceId: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  await db.hvacPayment.deleteMany({ where: { id: paymentId, tenantId: ctx.tenantId, invoiceId } });
  await recomputePaymentStatus(invoiceId);
  revalidatePath(`/hvac-b2b/racuni/${invoiceId}`);
}

export async function cancelInvoice(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { payments: true } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  if (inv.payments.length > 0) throw new ActionError("Račun s uplatama ne može se otkazati. Izdajte odobrenje.");
  await db.hvacInvoice.update({ where: { id }, data: { status: "CANCELLED" } });
  await logAudit(ctx, "invoice_cancelled", { entityType: "invoice", entityId: id });
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function sendInvoice(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { customer: true } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  if (inv.status === "DRAFT") throw new ActionError("Prvo izdajte račun.");
  const token = inv.publicToken ?? publicDocToken();
  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId }, select: { iban: true } });
  await db.hvacInvoice.update({ where: { id }, data: { publicToken: token, sentAt: new Date() } });

  if (inv.customer.email) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://varel.io";
    const mail = invoiceEmail({
      tenantName: ctx.tenant.name,
      customerName: inv.customer.companyName || [inv.customer.firstName, inv.customer.lastName].filter(Boolean).join(" "),
      number: inv.number,
      totalEur: Number(inv.totalEur),
      dueDate: inv.dueDate,
      iban: settings?.iban,
      link: `${base}/hvac-b2b/dokument/${token}`,
    });
    await sendEmail({ to: inv.customer.email, subject: mail.subject, text: mail.text, replyTo: ctx.tenant.email || undefined });
  }
  await logActivity(ctx, "invoice_sent", "invoice", id);
  revalidatePath(`/hvac-b2b/racuni/${id}`);
}

export async function deleteInvoice(id: string) {
  const ctx = await requireTenantRole(FINANCIAL_ROLES);
  const inv = await db.hvacInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inv) throw new ActionError("Račun nije pronađen.");
  if (inv.status !== "DRAFT") throw new ActionError("Samo nacrt računa može se obrisati.");
  await db.hvacInvoice.delete({ where: { id } });
  await logActivity(ctx, "invoice_deleted", "invoice", id);
  redirect("/hvac-b2b/racuni");
}
