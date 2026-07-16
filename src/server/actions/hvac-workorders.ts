"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity, logAudit } from "@/lib/hvac/tenant";
import { nextDocNumber } from "@/lib/hvac/numbering";
import { fd, fdNum, ActionError } from "./helpers";
import type { HvacWorkOrderStatus, HvacWorkOrderItemKind, HvacPriority } from "@/generated/prisma/client";

const LOCKED: HvacWorkOrderStatus[] = ["COMPLETED", "SENT"];

async function assertUnlocked(id: string, tenantId: string) {
  const wo = await db.hvacWorkOrder.findFirst({ where: { id, tenantId } });
  if (!wo) throw new ActionError("Radni nalog nije pronađen.");
  if (LOCKED.includes(wo.status)) throw new ActionError("Nalog je zaključan potpisom i ne može se mijenjati.");
  return wo;
}

/** Recomputes subtotal / VAT / total from the work order's items. */
async function recomputeTotals(workOrderId: string, tenantId: string) {
  const [items, tenant, settings] = await Promise.all([
    db.hvacWorkOrderItem.findMany({ where: { workOrderId } }),
    db.hvacTenant.findUnique({ where: { id: tenantId }, select: { vatRegistered: true } }),
    db.hvacTenantSettings.findUnique({ where: { tenantId }, select: { invoiceVatRate: true } }),
  ]);
  const subtotal = items.reduce((s, i) => s + Number(i.totalEur), 0);
  const rate = tenant?.vatRegistered ? Number(settings?.invoiceVatRate ?? 25) : 0;
  const vat = +(subtotal * (rate / 100)).toFixed(2);
  await db.hvacWorkOrder.update({
    where: { id: workOrderId },
    data: { subtotalEur: +subtotal.toFixed(2), vatEur: vat, totalEur: +(subtotal + vat).toFixed(2) },
  });
}

export async function createWorkOrderFromAppointment(appointmentId: string) {
  const ctx = await requireTenantContext();
  const appt = await db.hvacAppointment.findFirst({ where: { id: appointmentId, tenantId: ctx.tenantId } });
  if (!appt) throw new ActionError("Termin nije pronađen.");

  const existing = await db.hvacWorkOrder.findFirst({ where: { tenantId: ctx.tenantId, appointmentId } });
  if (existing) redirect(`/hvac-b2b/radni-nalozi/${existing.id}`);

  const wo = await db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, ctx.tenantId, "WORK_ORDER");
    return tx.hvacWorkOrder.create({
      data: {
        tenantId: ctx.tenantId, number, appointmentId,
        customerId: appt.customerId, locationId: appt.locationId, unitId: appt.unitId,
        serviceId: appt.serviceId, technicianId: appt.technicianId,
        status: "SCHEDULED", priority: appt.priority, issueDescription: appt.problemDescription,
      },
    });
  });
  await logActivity(ctx, "work_order_created", "work_order", wo.id, { from: "appointment" });
  redirect(`/hvac-b2b/radni-nalozi/${wo.id}`);
}

export async function createWorkOrder(form: FormData) {
  const ctx = await requireTenantContext();
  const customerId = fd(form, "customerId");
  if (!customerId) throw new ActionError("Odaberite klijenta.");
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) throw new ActionError("Klijent nije pronađen.");

  const wo = await db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, ctx.tenantId, "WORK_ORDER");
    return tx.hvacWorkOrder.create({
      data: {
        tenantId: ctx.tenantId, number, customerId,
        locationId: fd(form, "locationId") || null, unitId: fd(form, "unitId") || null,
        serviceId: fd(form, "serviceId") || null, technicianId: fd(form, "technicianId") || null,
        status: "DRAFT", priority: (fd(form, "priority") || "NORMAL") as HvacPriority,
        issueDescription: fd(form, "issueDescription") || null,
      },
    });
  });
  await logActivity(ctx, "work_order_created", "work_order", wo.id);
  redirect(`/hvac-b2b/radni-nalozi/${wo.id}`);
}

export async function updateWorkOrder(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  await assertUnlocked(id, ctx.tenantId);
  await db.hvacWorkOrder.update({
    where: { id },
    data: {
      technicianId: fd(form, "technicianId") || null,
      priority: (fd(form, "priority") || "NORMAL") as HvacPriority,
      issueDescription: fd(form, "issueDescription") || null,
      workPerformed: fd(form, "workPerformed") || null,
      technicianNotes: fd(form, "technicianNotes") || null,
      customerNotes: fd(form, "customerNotes") || null,
      recommendation: fd(form, "recommendation") || null,
      nextServiceDate: fd(form, "nextServiceDate") ? new Date(fd(form, "nextServiceDate")) : null,
      laborMinutes: fdNum(form, "laborMinutes"),
    },
  });
  await logActivity(ctx, "work_order_updated", "work_order", id);
  revalidatePath(`/hvac-b2b/radni-nalozi/${id}`);
}

export async function setWorkOrderStatus(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const status = fd(form, "status") as HvacWorkOrderStatus;
  const wo = await db.hvacWorkOrder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!wo) return;
  if (LOCKED.includes(wo.status)) throw new ActionError("Zaključan nalog ne može se ponovno otvarati kroz statuse.");
  const stamps: Record<string, Date> = {};
  if (status === "EN_ROUTE" && !wo.arrivalAt) stamps.arrivalAt = new Date();
  if (status === "IN_PROGRESS" && !wo.startAt) stamps.startAt = new Date();
  await db.hvacWorkOrder.update({ where: { id }, data: { status, ...stamps } });
  await logActivity(ctx, "work_order_status_changed", "work_order", id, { status });
  revalidatePath(`/hvac-b2b/radni-nalozi/${id}`);
  revalidatePath("/hvac-b2b/danas");
}

export async function addWorkOrderItem(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  await assertUnlocked(id, ctx.tenantId);
  const description = fd(form, "description");
  if (!description) throw new ActionError("Unesite opis stavke.");
  const quantity = fdNum(form, "quantity") ?? 1;
  const unitPrice = fdNum(form, "unitPriceEur") ?? 0;
  const count = await db.hvacWorkOrderItem.count({ where: { workOrderId: id } });
  await db.hvacWorkOrderItem.create({
    data: {
      tenantId: ctx.tenantId, workOrderId: id,
      kind: (fd(form, "kind") || "MATERIAL") as HvacWorkOrderItemKind,
      description, quantity, unit: fd(form, "unit") || "kom",
      unitPriceEur: unitPrice, totalEur: +(quantity * unitPrice).toFixed(2), position: count,
    },
  });
  await recomputeTotals(id, ctx.tenantId);
  revalidatePath(`/hvac-b2b/radni-nalozi/${id}`);
}

export async function removeWorkOrderItem(itemId: string, workOrderId: string) {
  const ctx = await requireTenantContext();
  await assertUnlocked(workOrderId, ctx.tenantId);
  await db.hvacWorkOrderItem.deleteMany({ where: { id: itemId, tenantId: ctx.tenantId } });
  await recomputeTotals(workOrderId, ctx.tenantId);
  revalidatePath(`/hvac-b2b/radni-nalozi/${workOrderId}`);
}

export async function removeWorkOrderPhoto(photoId: string, workOrderId: string) {
  const ctx = await requireTenantContext();
  await assertUnlocked(workOrderId, ctx.tenantId);
  await db.hvacWorkOrderPhoto.deleteMany({ where: { id: photoId, tenantId: ctx.tenantId } });
  revalidatePath(`/hvac-b2b/radni-nalozi/${workOrderId}`);
}

/**
 * Locks the work order with the customer's operational signature and marks it
 * completed. This is a handwritten operational confirmation, NOT a qualified
 * eIDAS signature. Creates a future service reminder when a next-service date
 * is set. After this the order cannot be silently edited.
 */
export async function finalizeWorkOrder(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const wo = await assertUnlocked(id, ctx.tenantId);

  const signerName = fd(form, "signerName");
  const fileAssetId = fd(form, "fileAssetId") || null;
  if (!signerName) throw new ActionError("Unesite ime potpisnika.");

  const consentText =
    "Potvrđujem da su navedeni radovi izvedeni i da sam upoznat/a s preporukama. Ovo je operativni potpis, a ne kvalificirani elektronički potpis.";

  await db.$transaction(async (tx) => {
    await tx.hvacWorkOrderSignature.upsert({
      where: { workOrderId: id },
      create: { tenantId: ctx.tenantId, workOrderId: id, signedByName: signerName, consentText, fileAssetId, collectedById: ctx.userId },
      update: { signedByName: signerName, consentText, fileAssetId, collectedById: ctx.userId, signedAt: new Date() },
    });
    await tx.hvacWorkOrder.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });

    // Future service reminder from the recommended next-service date.
    if (wo.unitId && wo.nextServiceDate) {
      await tx.hvacUnit.update({ where: { id: wo.unitId }, data: { nextServiceDate: wo.nextServiceDate } });
      await tx.hvacServiceReminder.create({
        data: {
          tenantId: ctx.tenantId, unitId: wo.unitId, customerId: wo.customerId,
          lastServiceDate: new Date(), nextServiceDate: wo.nextServiceDate, status: "FUTURE",
        },
      });
    }
  });

  await logAudit(ctx, "work_order_signed", { entityType: "work_order", entityId: id, after: { signerName } });
  await logActivity(ctx, "work_order_completed", "work_order", id);
  revalidatePath(`/hvac-b2b/radni-nalozi/${id}`);
  redirect(`/hvac-b2b/radni-nalozi/${id}`);
}

export async function markWorkOrderSent(id: string) {
  const ctx = await requireTenantContext();
  const wo = await db.hvacWorkOrder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!wo || wo.status !== "COMPLETED") return;
  await db.hvacWorkOrder.update({ where: { id }, data: { status: "SENT" } });
  await logActivity(ctx, "work_order_sent", "work_order", id);
  revalidatePath(`/hvac-b2b/radni-nalozi/${id}`);
}
