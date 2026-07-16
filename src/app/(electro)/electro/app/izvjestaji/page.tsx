import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere } from "@/lib/electro/project-access";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroReportsPage() {
  const ctx = await requireElectroContext();
  const projectIds = (await db.electroProject.findMany({ where: accessibleProjectsWhere(ctx), select: { id: true } })).map((p) => p.id);

  const reports = await db.electroReport.findMany({
    where: { companyId: ctx.company.id, projectId: { in: projectIds } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Izvještaji</h1>
      <p className="text-sm text-muted">Izvještaji se generiraju iz projekta (kartica Budžet → „Generiraj PDF izvještaj”).</p>
      <div className="space-y-2">
        {reports.map((r) => (
          <Link key={r.id} href={`${ELECTRO_APP_BASE}/izvjestaji/${r.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">{r.title}</p>
            <p className="text-sm text-muted">{r.project.code} · {r.createdAt.toLocaleString("hr-HR")}</p>
          </Link>
        ))}
        {reports.length === 0 && <p className="text-sm text-muted">Još nema izvještaja.</p>}
      </div>
    </div>
  );
}
