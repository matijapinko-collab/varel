import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_DAILY_LOG_STATUS_LABELS } from "@/lib/electro/workflow";
import { ElectroCreateDailyLogForm } from "@/components/electro/work/create-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroDailyLogsPage() {
  const ctx = await requireElectroContext();
  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);
  const isManager = canManageProjects(ctx);

  const logs = await db.electroDailyLog.findMany({
    where: { companyId: ctx.company.id, projectId: { in: projectIds } },
    include: { project: true },
    orderBy: { logDate: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Dnevnik gradilišta</h1>

      {isManager && projects.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Novi dnevni zapis</h2>
          <ElectroCreateDailyLogForm projects={projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))} />
        </section>
      )}

      <div className="space-y-2">
        {logs.map((l) => (
          <Link key={l.id} href={`${ELECTRO_APP_BASE}/dnevnik/${l.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">
              {l.logDate.toLocaleDateString("hr-HR")} · {l.project.code}
              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{ELECTRO_DAILY_LOG_STATUS_LABELS[l.status]}</span>
            </p>
            {l.activities && <p className="mt-0.5 truncate text-sm text-muted">{l.activities}</p>}
          </Link>
        ))}
        {logs.length === 0 && <p className="text-sm text-muted">Nema dnevnih zapisa.</p>}
      </div>
    </div>
  );
}
