"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { canTransitionTask, taskCompletionRequiresReview } from "@/lib/electro/workflow";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroTaskStatus, ElectroTaskPriority } from "@/generated/prisma/client";

/**
 * Tasks (brief §21). Any project member sees/updates tasks on their projects;
 * only managers create/assign. A task never auto-completes from an
 * electrician's action — it goes to WAITING_FOR_REVIEW first.
 */

const TASKS_PATH = `${ELECTRO_APP_BASE}/zadaci`;
const PRIORITIES = new Set<ElectroTaskPriority>(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

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

export type ElectroTaskResult = { error?: string; ok?: boolean };

export async function electroCreateTask(
  _prev: ElectroTaskResult,
  form: FormData
): Promise<ElectroTaskResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Samo voditelj, inženjer ili administrator može stvarati zadatke." };
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const title = f(form, "title");
  if (!title) return { error: "Naslov zadatka je obavezan." };
  const priorityRaw = f(form, "priority") as ElectroTaskPriority;
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";

  // Validate assignee is a member/employee of this company.
  const assigneeUserId = f(form, "assigneeUserId") || null;
  if (assigneeUserId && !(await db.electroUser.findFirst({ where: { id: assigneeUserId, companyId: ctx.company.id } }))) {
    return { error: "Odgovorna osoba nije pronađena." };
  }

  const task = await db.electroTask.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      phaseId: f(form, "phaseId") || null,
      locationId: f(form, "locationId") || null,
      title,
      description: f(form, "description") || null,
      priority,
      assigneeUserId,
      status: assigneeUserId ? "ASSIGNED" : "OPEN",
      createdByUserId: ctx.user.id,
      dueDate: dateOrNull(form, "dueDate"),
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "task_created", entityType: "task", entityId: task.id, after: { title } });
  redirect(`${TASKS_PATH}/${task.id}`);
}

export async function electroChangeTaskStatus(
  _prev: ElectroTaskResult,
  form: FormData
): Promise<ElectroTaskResult> {
  const ctx = await requireElectroContext();
  const taskId = f(form, "taskId");
  const task = await db.electroTask.findFirst({ where: { id: taskId, companyId: ctx.company.id } });
  if (!task) return { error: "Zadatak nije pronađen." };
  // Access: manager, or the assignee themselves.
  const isManager = canManageProjects(ctx);
  if (!isManager && task.assigneeUserId !== ctx.user.id) return { error: "Nemate ovlast za ovaj zadatak." };
  if (!(await loadAccessibleProject(ctx, task.projectId))) return { error: "Nemate pristup projektu." };

  const to = f(form, "toStatus") as ElectroTaskStatus;
  if (!canTransitionTask(task.status, to)) return { error: "Prijelaz statusa nije dopušten." };
  // Guard: only a manager may finalize COMPLETED, and only from review (§21).
  if (to === "COMPLETED") {
    if (!isManager) return { error: "Završetak zadatka potvrđuje voditelj ili inženjer." };
    if (taskCompletionRequiresReview(task.status)) return { error: "Zadatak mora prvo biti na pregledu prije završetka." };
  }

  await db.electroTask.update({
    where: { id: task.id },
    data: { status: to, completedAt: to === "COMPLETED" ? new Date() : task.completedAt },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "task_status_changed", entityType: "task", entityId: task.id, before: { status: task.status }, after: { status: to } });
  revalidatePath(`${TASKS_PATH}/${task.id}`);
  return { ok: true };
}

export async function electroAddChecklistItem(
  _prev: ElectroTaskResult,
  form: FormData
): Promise<ElectroTaskResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const taskId = f(form, "taskId");
  const task = await db.electroTask.findFirst({ where: { id: taskId, companyId: ctx.company.id } });
  if (!task) return { error: "Zadatak nije pronađen." };
  const text = f(form, "text");
  if (!text) return { error: "Unesite stavku." };

  const count = await db.electroTaskChecklistItem.count({ where: { taskId: task.id } });
  await db.electroTaskChecklistItem.create({ data: { taskId: task.id, text, sortOrder: count } });
  revalidatePath(`${TASKS_PATH}/${task.id}`);
  return { ok: true };
}

export async function electroToggleChecklistItem(
  _prev: ElectroTaskResult,
  form: FormData
): Promise<ElectroTaskResult> {
  const ctx = await requireElectroContext();
  const itemId = f(form, "itemId");
  const item = await db.electroTaskChecklistItem.findFirst({
    where: { id: itemId, task: { companyId: ctx.company.id } },
    include: { task: true },
  });
  if (!item) return { error: "Stavka nije pronađena." };
  const isManager = canManageProjects(ctx);
  if (!isManager && item.task.assigneeUserId !== ctx.user.id) return { error: "Nemate ovlast." };

  await db.electroTaskChecklistItem.update({ where: { id: item.id }, data: { isDone: !item.isDone } });
  revalidatePath(`${TASKS_PATH}/${item.taskId}`);
  return { ok: true };
}
