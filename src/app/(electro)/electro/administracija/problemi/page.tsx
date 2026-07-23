import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere } from "@/lib/electro/project-access";
import { ELECTRO_ISSUE_STATUS_LABELS, ELECTRO_ISSUE_TYPE_LABELS } from "@/lib/electro/workflow";
import { ElectroCreateIssueForm } from "@/components/electro/work/create-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroIssuesPage() {
  const ctx = await requireElectroContext();
  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);

  const issues = await db.electroIssue.findMany({
    where: { companyId: ctx.company.id, projectId: { in: projectIds } },
    include: { project: true },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Problemi</h1>

      {projects.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Prijavi problem</h2>
          <ElectroCreateIssueForm projects={projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))} />
        </section>
      )}

      <div className="space-y-2">
        {issues.map((i) => (
          <Link key={i.id} href={`${ELECTRO_APP_BASE}/problemi/${i.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">{i.title} <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{ELECTRO_ISSUE_STATUS_LABELS[i.status]}</span></p>
            <p className="mt-0.5 text-sm text-muted">{ELECTRO_ISSUE_TYPE_LABELS[i.type]} · {i.project.code}</p>
          </Link>
        ))}
        {issues.length === 0 && <p className="text-sm text-muted">Nema prijavljenih problema.</p>}
      </div>
    </div>
  );
}
