"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { canTransitionIssue, issueResolutionRequiresSolution } from "@/lib/electro/workflow";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroIssueType, ElectroIssueStatus, ElectroTaskPriority } from "@/generated/prisma/client";

/**
 * Issues / defects / risks (brief §36). Any project member can report; an issue
 * can't reach RESOLVED without a recorded solution, and only a manager verifies
 * or closes it.
 */

const ISSUES_PATH = `${ELECTRO_APP_BASE}/problemi`;
const TYPES = new Set<ElectroIssueType>([
  "TECHNICAL", "SAFETY", "MATERIAL_SHORTAGE", "DRAWING_ERROR", "EXECUTION_DEVIATION",
  "DELAY", "BLOCKER", "INVESTOR_REQUEST", "COMPLAINT", "QUALITY_DEFECT", "COMMERCIAL_RISK",
]);
const PRIORITIES = new Set<ElectroTaskPriority>(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroIssueResult = { error?: string; ok?: boolean };

export async function electroCreateIssue(
  _prev: ElectroIssueResult,
  form: FormData
): Promise<ElectroIssueResult> {
  const ctx = await requireElectroContext();
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const title = f(form, "title");
  if (!title) return { error: "Naslov problema je obavezan." };
  const typeRaw = f(form, "type") as ElectroIssueType;
  const type = TYPES.has(typeRaw) ? typeRaw : "TECHNICAL";
  const priorityRaw = f(form, "priority") as ElectroTaskPriority;
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";

  const issue = await db.electroIssue.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      locationId: f(form, "locationId") || null,
      type,
      priority,
      title,
      description: f(form, "description") || null,
      proposedSolution: f(form, "proposedSolution") || null,
      reportedByUserId: ctx.user.id,
      status: "OPEN",
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "issue_created", entityType: "issue", entityId: issue.id, after: { title, type } });
  redirect(`${ISSUES_PATH}/${issue.id}`);
}

export async function electroChangeIssueStatus(
  _prev: ElectroIssueResult,
  form: FormData
): Promise<ElectroIssueResult> {
  const ctx = await requireElectroContext();
  const issueId = f(form, "issueId");
  const issue = await db.electroIssue.findFirst({ where: { id: issueId, companyId: ctx.company.id } });
  if (!issue) return { error: "Problem nije pronađen." };
  if (!(await loadAccessibleProject(ctx, issue.projectId))) return { error: "Nemate pristup." };

  const to = f(form, "toStatus") as ElectroIssueStatus;
  const isManager = canManageProjects(ctx);
  if (!canTransitionIssue(issue.status, to)) return { error: "Prijelaz statusa nije dopušten." };
  // Only a manager verifies/closes (brief §36).
  if ((to === "VERIFIED" || to === "CLOSED") && !isManager) {
    return { error: "Provjeru i zatvaranje problema obavlja voditelj ili inženjer." };
  }
  // Moving to RESOLVED requires a solution recorded (brief §36).
  const actualSolution = f(form, "actualSolution");
  if (issueResolutionRequiresSolution(to) && !actualSolution && !issue.actualSolution) {
    return { error: "Za rješavanje problema unesite opis rješenja." };
  }

  await db.electroIssue.update({
    where: { id: issue.id },
    data: {
      status: to,
      actualSolution: actualSolution || issue.actualSolution,
      resolvedAt: to === "RESOLVED" ? new Date() : issue.resolvedAt,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "issue_status_changed", entityType: "issue", entityId: issue.id, before: { status: issue.status }, after: { status: to } });
  revalidatePath(`${ISSUES_PATH}/${issue.id}`);
  return { ok: true };
}

export async function electroAddIssueComment(
  _prev: ElectroIssueResult,
  form: FormData
): Promise<ElectroIssueResult> {
  const ctx = await requireElectroContext();
  const issueId = f(form, "issueId");
  const issue = await db.electroIssue.findFirst({ where: { id: issueId, companyId: ctx.company.id } });
  if (!issue) return { error: "Problem nije pronađen." };
  if (!(await loadAccessibleProject(ctx, issue.projectId))) return { error: "Nemate pristup." };
  const body = f(form, "body");
  if (!body) return { error: "Unesite komentar." };

  await db.electroIssueComment.create({ data: { issueId: issue.id, body, authorUserId: ctx.user.id } });
  revalidatePath(`${ISSUES_PATH}/${issue.id}`);
  return { ok: true };
}
