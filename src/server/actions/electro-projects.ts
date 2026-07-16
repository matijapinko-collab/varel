"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { checkIntLimit } from "@/lib/electro/limits";
import { canManageProjects, loadAccessibleProject } from "@/lib/electro/project-access";
import { nextProjectCode } from "@/lib/electro/project-code";
import { canTransition, transitionRequiresReason, clampPercent } from "@/lib/electro/projects";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroProjectStatus, ElectroProjectPriority } from "@/generated/prisma/client";

/**
 * Project management (brief §17–§19). Admin/engineer create & edit; project
 * members are set here too. All rows scoped to the authenticated company, and
 * edits use optimistic locking (version) to catch concurrent changes (§70).
 */

const PROJECTS_PATH = `${ELECTRO_APP_BASE}/projekti`;
const PRIORITIES = new Set<ElectroProjectPriority>(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

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
function decOrNull(form: FormData, key: string): string | null {
  const v = f(form, key).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? v : null;
}
function idsFrom(form: FormData, key: string): string[] {
  return [...new Set(form.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0))];
}

export type ElectroProjectResult = { error?: string; ok?: boolean };

export async function electroCreateProject(
  _prev: ElectroProjectResult,
  form: FormData
): Promise<ElectroProjectResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za stvaranje projekata." };

  const name = f(form, "name");
  if (!name) return { error: "Naziv projekta je obavezan." };

  const limit = await checkIntLimit(
    ctx.subscription.planId,
    "maxActiveProjects",
    await db.electroProject.count({ where: { companyId: ctx.company.id, isArchived: false } })
  );
  if (limit) return { error: limit };

  const priorityRaw = f(form, "priority") as ElectroProjectPriority;
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";
  const investorIds = idsFrom(form, "investorIds");
  const branchId = f(form, "branchId") || null;

  // Validate references belong to this tenant.
  const [validInvestors, validBranch] = await Promise.all([
    db.electroInvestor.findMany({ where: { id: { in: investorIds }, companyId: ctx.company.id } }),
    branchId ? db.electroBranch.findFirst({ where: { id: branchId, companyId: ctx.company.id } }) : Promise.resolve(null),
  ]);

  const code = await nextProjectCode(ctx.company.id);
  const project = await db.$transaction(async (tx) => {
    const p = await tx.electroProject.create({
      data: {
        companyId: ctx.company.id,
        code,
        name,
        description: f(form, "description") || null,
        priority,
        branchId: validBranch?.id ?? null,
        location: f(form, "location") || null,
        address: f(form, "address") || null,
        startDate: dateOrNull(form, "startDate"),
        contractDeadline: dateOrNull(form, "contractDeadline"),
        contractValue: decOrNull(form, "contractValue"),
        plannedBudget: decOrNull(form, "plannedBudget"),
      },
    });
    if (validInvestors.length) {
      await tx.electroProjectInvestor.createMany({
        data: validInvestors.map((inv) => ({ projectId: p.id, investorId: inv.id })),
      });
    }
    await tx.electroProjectStatusHistory.create({
      data: { projectId: p.id, toStatus: "DRAFT", changedByUserId: ctx.user.id, reason: "Projekt stvoren" },
    });
    return p;
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "project_created", entityType: "project", entityId: project.id, after: { code, name } });
  redirect(`${PROJECTS_PATH}/${project.id}`);
}

export async function electroUpdateProject(
  _prev: ElectroProjectResult,
  form: FormData
): Promise<ElectroProjectResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const projectId = f(form, "projectId");

  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  // Optimistic lock (brief §70).
  const expectedVersion = Number.parseInt(f(form, "version"), 10);
  if (Number.isFinite(expectedVersion) && expectedVersion !== project.version) {
    return { error: "Projekt je u međuvremenu izmijenjen. Osvježite stranicu i pokušajte ponovno." };
  }

  const name = f(form, "name");
  if (!name) return { error: "Naziv projekta je obavezan." };
  const priorityRaw = f(form, "priority") as ElectroProjectPriority;
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : project.priority;
  const investorIds = idsFrom(form, "investorIds");
  const branchId = f(form, "branchId") || null;

  const [validInvestors, validBranch] = await Promise.all([
    db.electroInvestor.findMany({ where: { id: { in: investorIds }, companyId: ctx.company.id } }),
    branchId ? db.electroBranch.findFirst({ where: { id: branchId, companyId: ctx.company.id } }) : Promise.resolve(null),
  ]);

  await db.$transaction(async (tx) => {
    await tx.electroProject.update({
      where: { id: project.id },
      data: {
        name,
        description: f(form, "description") || null,
        priority,
        branchId: validBranch?.id ?? null,
        location: f(form, "location") || null,
        address: f(form, "address") || null,
        startDate: dateOrNull(form, "startDate"),
        contractDeadline: dateOrNull(form, "contractDeadline"),
        estimatedDeadline: dateOrNull(form, "estimatedDeadline"),
        contractValue: decOrNull(form, "contractValue"),
        plannedBudget: decOrNull(form, "plannedBudget"),
        completionPercent: clampPercent(Number.parseInt(f(form, "completionPercent"), 10)),
        delayReason: f(form, "delayReason") || null,
        version: { increment: 1 },
      },
    });
    await tx.electroProjectInvestor.deleteMany({ where: { projectId: project.id } });
    if (validInvestors.length) {
      await tx.electroProjectInvestor.createMany({
        data: validInvestors.map((inv) => ({ projectId: project.id, investorId: inv.id })),
      });
    }
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "project_updated", entityType: "project", entityId: project.id });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

export async function electroChangeProjectStatus(
  _prev: ElectroProjectResult,
  form: FormData
): Promise<ElectroProjectResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const projectId = f(form, "projectId");

  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const toStatus = f(form, "toStatus") as ElectroProjectStatus;
  const reason = f(form, "reason");
  if (!canTransition(project.status, toStatus)) {
    return { error: `Prijelaz iz statusa nije dopušten.` };
  }
  if (transitionRequiresReason(project.status, toStatus) && !reason) {
    return { error: "Za ovaj prijelaz potrebno je unijeti razlog." };
  }

  await db.$transaction([
    db.electroProject.update({
      where: { id: project.id },
      data: {
        status: toStatus,
        actualEndDate: toStatus === "COMPLETED" ? new Date() : project.actualEndDate,
        isArchived: toStatus === "ARCHIVED" ? true : project.isArchived,
        version: { increment: 1 },
      },
    }),
    db.electroProjectStatusHistory.create({
      data: { projectId: project.id, fromStatus: project.status, toStatus, reason: reason || null, changedByUserId: ctx.user.id },
    }),
  ]);

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "project_status_changed", entityType: "project", entityId: project.id, before: { status: project.status }, after: { status: toStatus, reason } });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}

export async function electroSetProjectMembers(
  _prev: ElectroProjectResult,
  form: FormData
): Promise<ElectroProjectResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const projectId = f(form, "projectId");

  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const userIds = idsFrom(form, "memberIds");
  const validUsers = await db.electroUser.findMany({
    where: { id: { in: userIds }, companyId: ctx.company.id, status: { not: "ARCHIVED" } },
    include: { roles: { include: { role: true } } },
  });

  await db.$transaction(async (tx) => {
    await tx.electroProjectMember.deleteMany({ where: { projectId: project.id } });
    if (validUsers.length) {
      await tx.electroProjectMember.createMany({
        data: validUsers.map((u) => ({
          projectId: project.id,
          userId: u.id,
          // Default the project role to the user's primary company role.
          projectRole: u.roles[0]?.role.key ?? "ELECTRICIAN",
          isActive: true,
        })),
      });
    }
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "project_members_set", entityType: "project", entityId: project.id, after: { count: validUsers.length } });
  revalidatePath(`${PROJECTS_PATH}/${project.id}`);
  return { ok: true };
}
