"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects, loadAccessibleProject } from "@/lib/electro/project-access";
import { clampPercent } from "@/lib/electro/projects";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroLocationType, ElectroPhaseStatus } from "@/generated/prisma/client";

/**
 * Project phases (brief §19) and locations (brief §18). Admin/engineer only;
 * every operation re-loads the project through loadAccessibleProject so it is
 * both tenant- and access-scoped before any write.
 */

const PROJECTS_PATH = `${ELECTRO_APP_BASE}/projekti`;
const LOCATION_TYPES = new Set<ElectroLocationType>([
  "SUBPROJECT", "BUILDING", "ENTRANCE", "ZONE", "FLOOR", "ROOM", "TECHNICAL_UNIT",
]);
const PHASE_STATUSES = new Set<ElectroPhaseStatus>([
  "NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING_FOR_REVIEW", "CHANGES_REQUIRED", "APPROVED", "COMPLETED",
]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroStructureResult = { error?: string; ok?: boolean };

async function requireProject(projectId: string) {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." as const };
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." as const };
  return { ctx, project };
}

// ─────────────────────────────── Phases ────────────────────────────────

export async function electroAddPhase(
  _prev: ElectroStructureResult,
  form: FormData
): Promise<ElectroStructureResult> {
  const r = await requireProject(f(form, "projectId"));
  if ("error" in r) return r;
  const { ctx, project } = r;

  const name = f(form, "name");
  if (!name) return { error: "Naziv faze je obavezan." };

  const count = await db.electroProjectPhase.count({ where: { projectId: project.id } });
  const phase = await db.electroProjectPhase.create({
    data: { projectId: project.id, name, description: f(form, "description") || null, sortOrder: count },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "phase_added", entityType: "phase", entityId: phase.id, after: { name } });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

export async function electroUpdatePhase(
  _prev: ElectroStructureResult,
  form: FormData
): Promise<ElectroStructureResult> {
  const r = await requireProject(f(form, "projectId"));
  if ("error" in r) return r;
  const { ctx, project } = r;

  const phaseId = f(form, "phaseId");
  const phase = await db.electroProjectPhase.findFirst({ where: { id: phaseId, projectId: project.id } });
  if (!phase) return { error: "Faza nije pronađena." };

  const statusRaw = f(form, "status") as ElectroPhaseStatus;
  const status = PHASE_STATUSES.has(statusRaw) ? statusRaw : phase.status;
  const name = f(form, "name") || phase.name;

  await db.electroProjectPhase.update({
    where: { id: phase.id },
    data: { name, status, progressPercent: clampPercent(Number.parseInt(f(form, "progressPercent"), 10)) },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "phase_updated", entityType: "phase", entityId: phase.id, before: { status: phase.status }, after: { status } });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

export async function electroDeletePhase(
  _prev: ElectroStructureResult,
  form: FormData
): Promise<ElectroStructureResult> {
  const r = await requireProject(f(form, "projectId"));
  if ("error" in r) return r;
  const { ctx, project } = r;
  const phaseId = f(form, "phaseId");
  const phase = await db.electroProjectPhase.findFirst({ where: { id: phaseId, projectId: project.id } });
  if (!phase) return { error: "Faza nije pronađena." };

  await db.electroProjectPhase.delete({ where: { id: phase.id } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "phase_deleted", entityType: "phase", entityId: phase.id });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

// ────────────────────────────── Locations ──────────────────────────────

export async function electroAddLocation(
  _prev: ElectroStructureResult,
  form: FormData
): Promise<ElectroStructureResult> {
  const r = await requireProject(f(form, "projectId"));
  if ("error" in r) return r;
  const { ctx, project } = r;

  const name = f(form, "name");
  if (!name) return { error: "Naziv lokacije je obavezan." };
  const typeRaw = f(form, "type") as ElectroLocationType;
  const type = LOCATION_TYPES.has(typeRaw) ? typeRaw : "BUILDING";

  // A parent, if given, must belong to the same project (tenant-safe).
  const parentId = f(form, "parentId") || null;
  if (parentId) {
    const parent = await db.electroProjectLocation.findFirst({ where: { id: parentId, projectId: project.id } });
    if (!parent) return { error: "Nadređena lokacija nije pronađena." };
  }

  const count = await db.electroProjectLocation.count({ where: { projectId: project.id, parentId } });
  const loc = await db.electroProjectLocation.create({
    data: { projectId: project.id, parentId, type, name, sortOrder: count },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "location_added", entityType: "location", entityId: loc.id, after: { name, type } });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

export async function electroDeleteLocation(
  _prev: ElectroStructureResult,
  form: FormData
): Promise<ElectroStructureResult> {
  const r = await requireProject(f(form, "projectId"));
  if ("error" in r) return r;
  const { ctx, project } = r;
  const locationId = f(form, "locationId");
  const loc = await db.electroProjectLocation.findFirst({ where: { id: locationId, projectId: project.id } });
  if (!loc) return { error: "Lokacija nije pronađena." };

  // Children cascade via the schema relation.
  await db.electroProjectLocation.delete({ where: { id: loc.id } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "location_deleted", entityType: "location", entityId: loc.id });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}
