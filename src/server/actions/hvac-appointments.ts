"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity } from "@/lib/hvac/tenant";
import { fd, fdNum } from "./helpers";
import type { HvacAppointmentStatus, HvacPriority, HvacSource } from "@/generated/prisma/client";

export type ApptResult = { error?: string; conflict?: string };

/** Combines a yyyy-mm-dd date and HH:mm time into a local Date. */
function combine(dateStr: string, timeStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Statuses that no longer occupy a technician's time. */
const FREEING: HvacAppointmentStatus[] = ["CANCELLED", "NO_SHOW", "COMPLETED"];

/**
 * Returns a human conflict description when the technician is already booked in
 * the interval. Overlaps are prevented by default but can be overridden by an
 * authorized user (confirmed in the form).
 */
async function findConflict(
  tenantId: string, technicianId: string | null, startAt: Date, endAt: Date, ignoreId?: string,
): Promise<string | null> {
  if (!technicianId) return null;
  const clash = await db.hvacAppointment.findFirst({
    where: {
      tenantId, technicianId, deletedAt: null,
      status: { notIn: FREEING },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { customer: true },
  });
  if (!clash) return null;
  const t = clash.startAt.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
  return `Majstor već ima termin u ${t}. Označite potvrdu ispod za svejedno spremanje.`;
}

function readForm(form: FormData) {
  const date = fd(form, "date");
  const time = fd(form, "startTime");
  const startAt = combine(date, time);
  const duration = fdNum(form, "durationMin") ?? 60;
  return {
    startAt,
    endAt: startAt ? new Date(startAt.getTime() + duration * 60_000) : null,
    duration,
    customerId: fd(form, "customerId"),
    locationId: fd(form, "locationId") || null,
    unitId: fd(form, "unitId") || null,
    serviceId: fd(form, "serviceId") || null,
    technicianId: fd(form, "technicianId") || null,
    status: (fd(form, "status") || "WAITING_CONFIRMATION") as HvacAppointmentStatus,
    priority: (fd(form, "priority") || "NORMAL") as HvacPriority,
    source: (fd(form, "source") || "MANUAL") as HvacSource,
    problemDescription: fd(form, "problemDescription") || null,
    internalNote: fd(form, "internalNote") || null,
    customerNote: fd(form, "customerNote") || null,
    force: form.get("force") === "on" || form.get("force") === "true",
  };
}

export async function createAppointment(_prev: ApptResult, form: FormData): Promise<ApptResult> {
  const ctx = await requireTenantContext();
  const v = readForm(form);

  if (!v.customerId) return { error: "Odaberite klijenta." };
  if (!v.startAt || !v.endAt) return { error: "Unesite ispravan datum i vrijeme." };

  const customer = await db.hvacCustomer.findFirst({ where: { id: v.customerId, tenantId: ctx.tenantId } });
  if (!customer) return { error: "Klijent nije pronađen." };

  if (!v.force) {
    const conflict = await findConflict(ctx.tenantId, v.technicianId, v.startAt, v.endAt);
    if (conflict) return { conflict };
  }

  const appt = await db.hvacAppointment.create({
    data: {
      tenantId: ctx.tenantId,
      customerId: v.customerId, locationId: v.locationId, unitId: v.unitId,
      serviceId: v.serviceId, technicianId: v.technicianId,
      startAt: v.startAt, endAt: v.endAt, estimatedDurationMin: v.duration,
      status: v.technicianId && v.status === "WAITING_CONFIRMATION" ? "TECH_ASSIGNED" : v.status,
      priority: v.priority, source: v.source,
      problemDescription: v.problemDescription, internalNote: v.internalNote, customerNote: v.customerNote,
    },
  });
  await logActivity(ctx, "appointment_created", "appointment", appt.id);
  revalidatePath("/hvac-b2b/kalendar");
  revalidatePath("/hvac-b2b/danas");
  redirect(`/hvac-b2b/kalendar/${appt.id}`);
}

export async function updateAppointment(id: string, _prev: ApptResult, form: FormData): Promise<ApptResult> {
  const ctx = await requireTenantContext();
  const existing = await db.hvacAppointment.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return { error: "Termin nije pronađen." };

  const v = readForm(form);
  if (!v.startAt || !v.endAt) return { error: "Unesite ispravan datum i vrijeme." };

  if (!v.force) {
    const conflict = await findConflict(ctx.tenantId, v.technicianId, v.startAt, v.endAt, id);
    if (conflict) return { conflict };
  }

  await db.hvacAppointment.update({
    where: { id },
    data: {
      locationId: v.locationId, unitId: v.unitId, serviceId: v.serviceId, technicianId: v.technicianId,
      startAt: v.startAt, endAt: v.endAt, estimatedDurationMin: v.duration,
      status: v.status, priority: v.priority,
      problemDescription: v.problemDescription, internalNote: v.internalNote, customerNote: v.customerNote,
    },
  });
  await logActivity(ctx, "appointment_updated", "appointment", id);
  revalidatePath("/hvac-b2b/kalendar");
  revalidatePath(`/hvac-b2b/kalendar/${id}`);
  redirect(`/hvac-b2b/kalendar/${id}`);
}

/** Quick status change from the appointment page / technician view. */
export async function setAppointmentStatus(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const status = fd(form, "status") as HvacAppointmentStatus;
  const appt = await db.hvacAppointment.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!appt) return;
  await db.hvacAppointment.update({
    where: { id },
    data: { status, confirmed: status === "CONFIRMED" ? true : appt.confirmed },
  });
  await logActivity(ctx, "appointment_status_changed", "appointment", id, { status });
  revalidatePath("/hvac-b2b/kalendar");
  revalidatePath(`/hvac-b2b/kalendar/${id}`);
  revalidatePath("/hvac-b2b/danas");
}

export async function assignTechnician(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const technicianId = fd(form, "technicianId") || null;
  const appt = await db.hvacAppointment.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!appt) return;
  await db.hvacAppointment.update({
    where: { id },
    data: { technicianId, status: technicianId && appt.status === "WAITING_CONFIRMATION" ? "TECH_ASSIGNED" : appt.status },
  });
  await logActivity(ctx, "appointment_technician_assigned", "appointment", id, { technicianId });
  revalidatePath("/hvac-b2b/kalendar");
  revalidatePath(`/hvac-b2b/kalendar/${id}`);
}

export async function cancelAppointment(id: string) {
  const ctx = await requireTenantContext();
  await db.hvacAppointment.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { status: "CANCELLED" } });
  await logActivity(ctx, "appointment_cancelled", "appointment", id);
  revalidatePath("/hvac-b2b/kalendar");
  redirect("/hvac-b2b/kalendar");
}

/** Duplicates an appointment one week later, keeping the same slot. */
export async function duplicateAppointment(id: string) {
  const ctx = await requireTenantContext();
  const a = await db.hvacAppointment.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!a) return;
  const shift = 7 * 86_400_000;
  const copy = await db.hvacAppointment.create({
    data: {
      tenantId: ctx.tenantId, customerId: a.customerId, locationId: a.locationId, unitId: a.unitId,
      serviceId: a.serviceId, technicianId: a.technicianId,
      startAt: new Date(a.startAt.getTime() + shift), endAt: new Date(a.endAt.getTime() + shift),
      estimatedDurationMin: a.estimatedDurationMin, status: "WAITING_CONFIRMATION",
      priority: a.priority, source: a.source, problemDescription: a.problemDescription,
    },
  });
  await logActivity(ctx, "appointment_duplicated", "appointment", copy.id);
  redirect(`/hvac-b2b/kalendar/${copy.id}`);
}
