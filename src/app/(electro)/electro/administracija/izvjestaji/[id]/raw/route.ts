import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getElectroContext } from "@/lib/electro/auth/guard";
import { loadAccessibleProject } from "@/lib/electro/project-access";

/**
 * Serves the raw report HTML for printing to PDF (brief §35). Auth + per-project
 * access are enforced here exactly like the pages — a report is never public.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const context = await getElectroContext();
  if (!context) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const report = await db.electroReport.findFirst({ where: { id, companyId: context.company.id } });
  if (!report) return new NextResponse("Not found", { status: 404 });
  if (!(await loadAccessibleProject(context, report.projectId))) return new NextResponse("Forbidden", { status: 403 });

  return new NextResponse(report.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
  });
}
