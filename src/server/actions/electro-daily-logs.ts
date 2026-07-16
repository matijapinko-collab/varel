"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { dailyLogIsEditable } from "@/lib/electro/workflow";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Site diary (brief §33). A locked log is immutable — any correction is a new
 * revision, never a silent edit. Managers write and lock; the project team can
 * read.
 */

const LOGS_PATH = `${ELECTRO_APP_BASE}/dnevnik`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function dateOrNull(form: FormData, key: string): Date | null {
  const v = f(form, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ElectroLogResult = { error?: string; ok?: boolean };

export async function electroCreateDailyLog(
  _prev: ElectroLogResult,
  form: FormData
): Promise<ElectroLogResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Dnevnik vodi voditelj gradilišta, inženjer ili administrator." };
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const logDate = dateOrNull(form, "logDate") ?? new Date();
  const workerCountRaw = f(form, "workerCount");
  const workerCount = workerCountRaw ? Number.parseInt(workerCountRaw, 10) : null;

  const log = await db.electroDailyLog.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      logDate,
      workerCount: Number.isFinite(workerCount as number) ? workerCount : null,
      weather: f(form, "weather") || null,
      activities: f(form, "activities") || null,
      notes: f(form, "notes") || null,
      nextDayPlan: f(form, "nextDayPlan") || null,
      authorUserId: ctx.user.id,
      status: "DRAFT",
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "daily_log_created", entityType: "daily_log", entityId: log.id });
  redirect(`${LOGS_PATH}/${log.id}`);
}

export async function electroUpdateDailyLog(
  _prev: ElectroLogResult,
  form: FormData
): Promise<ElectroLogResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const logId = f(form, "logId");
  const log = await db.electroDailyLog.findFirst({ where: { id: logId, companyId: ctx.company.id } });
  if (!log) return { error: "Dnevnik nije pronađen." };
  if (!dailyLogIsEditable(log.status)) {
    return { error: "Zaključan ili odobren dnevnik nije moguće mijenjati. Dodajte reviziju." };
  }

  const workerCountRaw = f(form, "workerCount");
  const workerCount = workerCountRaw ? Number.parseInt(workerCountRaw, 10) : null;
  await db.electroDailyLog.update({
    where: { id: log.id },
    data: {
      workerCount: Number.isFinite(workerCount as number) ? workerCount : null,
      weather: f(form, "weather") || null,
      activities: f(form, "activities") || null,
      notes: f(form, "notes") || null,
      nextDayPlan: f(form, "nextDayPlan") || null,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "daily_log_updated", entityType: "daily_log", entityId: log.id });
  revalidatePath(`${LOGS_PATH}/${log.id}`);
  return { ok: true };
}

/** DRAFT→SUBMITTED→APPROVED→LOCKED. Only forward; LOCKED is terminal. */
export async function electroAdvanceDailyLog(
  _prev: ElectroLogResult,
  form: FormData
): Promise<ElectroLogResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const logId = f(form, "logId");
  const action = f(form, "advance"); // submit | approve | lock
  const log = await db.electroDailyLog.findFirst({ where: { id: logId, companyId: ctx.company.id } });
  if (!log) return { error: "Dnevnik nije pronađen." };

  const now = new Date();
  if (action === "submit" && log.status === "DRAFT") {
    await db.electroDailyLog.update({ where: { id: log.id }, data: { status: "SUBMITTED", submittedAt: now } });
  } else if (action === "approve" && log.status === "SUBMITTED") {
    await db.electroDailyLog.update({ where: { id: log.id }, data: { status: "APPROVED", approvedAt: now } });
  } else if (action === "lock" && (log.status === "APPROVED" || log.status === "SUBMITTED")) {
    await db.electroDailyLog.update({ where: { id: log.id }, data: { status: "LOCKED", lockedAt: now } });
  } else {
    return { error: "Radnja nije moguća za trenutni status dnevnika." };
  }
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: `daily_log_${action}`, entityType: "daily_log", entityId: log.id, before: { status: log.status } });
  revalidatePath(`${LOGS_PATH}/${log.id}`);
  return { ok: true };
}

/** Amend a locked log with a separate, immutable revision (brief §33). */
export async function electroAddLogRevision(
  _prev: ElectroLogResult,
  form: FormData
): Promise<ElectroLogResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const logId = f(form, "logId");
  const log = await db.electroDailyLog.findFirst({ where: { id: logId, companyId: ctx.company.id } });
  if (!log) return { error: "Dnevnik nije pronađen." };
  const note = f(form, "note");
  if (!note) return { error: "Unesite tekst revizije." };

  await db.electroDailyLogRevision.create({ data: { dailyLogId: log.id, note, authorUserId: ctx.user.id } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "daily_log_revision_added", entityType: "daily_log", entityId: log.id });
  revalidatePath(`${LOGS_PATH}/${log.id}`);
  return { ok: true };
}
