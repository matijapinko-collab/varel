"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroCostCategory } from "@/generated/prisma/client";

/**
 * Project budget and costs (brief §45–§47). Financial data is manager/admin
 * only — not every role may see or edit it. Budget is upserted; costs are an
 * append log.
 */

const CATEGORIES = new Set<ElectroCostCategory>([
  "MATERIAL", "LABOR", "SUBCONTRACTOR", "EQUIPMENT_RENTAL", "TRANSPORT", "ADMINISTRATION", "EXTRA_WORK", "OTHER",
]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function decOrNull(form: FormData, key: string): string | null {
  const v = f(form, key).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? v : null;
}

export type ElectroBudgetResult = { error?: string; ok?: boolean };

export async function electroSaveBudget(
  _prev: ElectroBudgetResult,
  form: FormData
): Promise<ElectroBudgetResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za budžet." };
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const data = {
    materialBudget: decOrNull(form, "materialBudget"),
    laborBudget: decOrNull(form, "laborBudget"),
    subcontractorBudget: decOrNull(form, "subcontractorBudget"),
    otherBudget: decOrNull(form, "otherBudget"),
    reserve: decOrNull(form, "reserve"),
  };
  await db.electroProjectBudget.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, ...data },
    update: data,
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "budget_saved", entityType: "project", entityId: project.id });
  revalidatePath(`${ELECTRO_APP_BASE}/projekti/${project.id}/budzet`);
  return { ok: true };
}

export async function electroAddCost(
  _prev: ElectroBudgetResult,
  form: FormData
): Promise<ElectroBudgetResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za troškove." };
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const description = f(form, "description");
  const amount = Number(f(form, "amount").replace(",", "."));
  if (!description) return { error: "Opis troška je obavezan." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Iznos mora biti pozitivan broj." };
  const catRaw = f(form, "category") as ElectroCostCategory;
  const category = CATEGORIES.has(catRaw) ? catRaw : "OTHER";

  await db.electroProjectCost.create({
    data: { companyId: ctx.company.id, projectId: project.id, category, description, amount: amount.toString(), createdByUserId: ctx.user.id },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "cost_added", entityType: "project", entityId: project.id, after: { category, amount } });
  revalidatePath(`${ELECTRO_APP_BASE}/projekti/${project.id}/budzet`);
  return { ok: true };
}
