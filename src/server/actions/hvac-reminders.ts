"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity } from "@/lib/hvac/tenant";
import { computeNextServiceDate, autoStatusFor } from "@/lib/hvac/reminders";
import { fd, fdNum, ActionError } from "./helpers";
import type { HvacReminderStatus } from "@/generated/prisma/client";

const PATH = "/hvac-b2b/servisni-podsjetnici";

export async function createReminder(form: FormData) {
  const ctx = await requireTenantContext();
  const unitId = fd(form, "unitId");
  const unit = await db.hvacUnit.findFirst({ where: { id: unitId, tenantId: ctx.tenantId }, select: { id: true, customerId: true } });
  if (!unit) throw new ActionError("Uređaj nije pronađen.");

  const intervalMonths = fdNum(form, "intervalMonths") ?? 12;
  const nextRaw = fd(form, "nextServiceDate");
  const lastRaw = fd(form, "lastServiceDate");
  const lastServiceDate = lastRaw ? new Date(lastRaw) : null;
  const nextServiceDate = nextRaw
    ? new Date(nextRaw)
    : lastServiceDate
      ? computeNextServiceDate(lastServiceDate, intervalMonths)
      : computeNextServiceDate(new Date(), intervalMonths);

  await db.hvacServiceReminder.create({
    data: {
      tenantId: ctx.tenantId, unitId, customerId: unit.customerId,
      lastServiceDate, nextServiceDate, intervalMonths,
      status: autoStatusFor(nextServiceDate),
      note: fd(form, "note") || null,
    },
  });
  await logActivity(ctx, "reminder_created", "reminder", unitId);
  revalidatePath(PATH);
}

/**
 * Creates reminders for units that have a nextServiceDate but no active
 * reminder yet. Safe to run repeatedly (skips units already covered).
 */
export async function syncRemindersFromUnits() {
  const ctx = await requireTenantContext();
  const created = await generateRemindersForTenant(ctx.tenantId);
  await logActivity(ctx, "reminders_synced", "reminder", undefined, { created });
  revalidatePath(PATH);
}

/** Shared by the sync action and the cron job. Returns how many were created. */
export async function generateRemindersForTenant(tenantId: string): Promise<number> {
  const units = await db.hvacUnit.findMany({
    where: { tenantId, nextServiceDate: { not: null }, status: { in: ["ACTIVE", "UNDER_REPAIR"] } },
    select: { id: true, customerId: true, nextServiceDate: true },
  });
  if (units.length === 0) return 0;
  const active: HvacReminderStatus[] = ["FUTURE", "UPCOMING", "READY", "CONTACTED"];
  const existing = await db.hvacServiceReminder.findMany({
    where: { tenantId, unitId: { in: units.map((u) => u.id) }, status: { in: active } },
    select: { unitId: true },
  });
  const covered = new Set(existing.map((e) => e.unitId));
  const toCreate = units.filter((u) => u.nextServiceDate && !covered.has(u.id));
  if (toCreate.length === 0) return 0;
  await db.hvacServiceReminder.createMany({
    data: toCreate.map((u) => ({
      tenantId, unitId: u.id, customerId: u.customerId,
      nextServiceDate: u.nextServiceDate!,
      intervalMonths: 12, status: autoStatusFor(u.nextServiceDate!),
    })),
  });
  return toCreate.length;
}

export async function setReminderStatus(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const status = fd(form, "status") as HvacReminderStatus;
  const r = await db.hvacServiceReminder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!r) throw new ActionError("Podsjetnik nije pronađen.");
  await db.hvacServiceReminder.update({
    where: { id },
    data: {
      status,
      contactAttempts: status === "CONTACTED" ? r.contactAttempts + 1 : r.contactAttempts,
    },
  });
  await logActivity(ctx, "reminder_status", "reminder", id, { status });
  revalidatePath(PATH);
}

/** Push a reminder out by N months (default = its interval). */
export async function postponeReminder(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const r = await db.hvacServiceReminder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!r) throw new ActionError("Podsjetnik nije pronađen.");
  const months = fdNum(form, "months") ?? r.intervalMonths;
  const next = computeNextServiceDate(r.nextServiceDate, months);
  await db.hvacServiceReminder.update({ where: { id }, data: { nextServiceDate: next, status: autoStatusFor(next) } });
  await logActivity(ctx, "reminder_postponed", "reminder", id, { months });
  revalidatePath(PATH);
}

/**
 * Marks the reminder done and rolls it forward one interval — the standard
 * "serviced, schedule the next one" action.
 */
export async function completeReminderAndRoll(id: string) {
  const ctx = await requireTenantContext();
  const r = await db.hvacServiceReminder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!r) throw new ActionError("Podsjetnik nije pronađen.");
  const now = new Date();
  const next = computeNextServiceDate(now, r.intervalMonths);
  await db.hvacServiceReminder.update({
    where: { id },
    data: { lastServiceDate: now, nextServiceDate: next, status: autoStatusFor(next), contactAttempts: 0 },
  });
  await db.hvacUnit.update({ where: { id: r.unitId }, data: { nextServiceDate: next } }).catch(() => {});
  await logActivity(ctx, "reminder_completed", "reminder", id);
  revalidatePath(PATH);
}

export async function deleteReminder(id: string) {
  const ctx = await requireTenantContext();
  await db.hvacServiceReminder.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  await logActivity(ctx, "reminder_deleted", "reminder", id);
  revalidatePath(PATH);
}

/** Turns a due reminder into an inquiry the office can schedule. */
export async function reminderToInquiry(id: string) {
  const ctx = await requireTenantContext();
  const r = await db.hvacServiceReminder.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!r) throw new ActionError("Podsjetnik nije pronađen.");
  const [customer, unit] = await Promise.all([
    db.hvacCustomer.findFirst({ where: { id: r.customerId, tenantId: ctx.tenantId } }),
    db.hvacUnit.findFirst({ where: { id: r.unitId, tenantId: ctx.tenantId } }),
  ]);
  const inquiry = await db.hvacInquiry.create({
    data: {
      tenantId: ctx.tenantId,
      customerId: r.customerId,
      leadName: customer ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.companyName : null,
      leadPhone: customer?.phone ?? null,
      leadEmail: customer?.email ?? null,
      source: "EXISTING_CUSTOMER",
      issueDescription: `Redovni servis — ${[unit?.manufacturer, unit?.model].filter(Boolean).join(" ") || "uređaj"}`,
      note: "Kreirano iz servisnog podsjetnika.",
    },
  });
  await db.hvacServiceReminder.update({ where: { id }, data: { status: "CONTACTED", contactAttempts: r.contactAttempts + 1 } });
  await logActivity(ctx, "reminder_to_inquiry", "inquiry", inquiry.id, { reminderId: id });
  redirect(`/hvac-b2b/upiti/${inquiry.id}`);
}
