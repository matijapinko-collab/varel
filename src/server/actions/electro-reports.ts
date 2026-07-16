"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { buildProjectReportHtml } from "@/lib/electro/report";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Report generation (brief §34–§35). Builds an HTML report from live project
 * data and saves it as its own ElectroReport row (a version). Managers/engineers
 * only. The saved report can be opened and printed to PDF.
 */

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroReportResult = { error?: string; ok?: boolean };

export async function electroGenerateReport(
  _prev: ElectroReportResult,
  form: FormData
): Promise<ElectroReportResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za izvještaje." };
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const built = await buildProjectReportHtml(ctx.company.id, project.id);
  if (!built) return { error: "Izvještaj nije moguće generirati." };

  const report = await db.electroReport.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      title: built.title,
      kind: f(form, "kind") || "progress",
      html: built.html,
      createdByUserId: ctx.user.id,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "report_generated", entityType: "report", entityId: report.id });
  redirect(`${ELECTRO_APP_BASE}/izvjestaji/${report.id}`);
}
