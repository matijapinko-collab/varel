import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_DAILY_LOG_STATUS_LABELS } from "@/lib/electro/workflow";
import { ElectroDailyLogControls } from "@/components/electro/work/daily-log-panels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroDailyLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const log = await db.electroDailyLog.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { project: true, revisions: { orderBy: { createdAt: "desc" } } },
  });
  if (!log) notFound();
  if (!(await loadAccessibleProject(ctx, log.projectId))) notFound();
  const isManager = canManageProjects(ctx);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/dnevnik`} className="text-sm text-muted hover:text-foreground">← Dnevnik</Link>

      <section className={electroCardCls}>
        <h1 className="text-xl font-bold">Dnevni zapis · {log.logDate.toLocaleDateString("hr-HR")}</h1>
        <p className="mt-1 text-sm text-muted">
          {log.project.code} · Status: <strong>{ELECTRO_DAILY_LOG_STATUS_LABELS[log.status]}</strong>
          {log.workerCount != null && ` · ${log.workerCount} radnika`}
          {log.weather && ` · ${log.weather}`}
        </p>
        {log.activities && <p className="mt-3 text-sm"><strong>Aktivnosti:</strong> {log.activities}</p>}
        {log.notes && <p className="mt-1 text-sm"><strong>Napomene:</strong> {log.notes}</p>}
        {log.nextDayPlan && <p className="mt-1 text-sm"><strong>Plan za sljedeći dan:</strong> {log.nextDayPlan}</p>}
      </section>

      {isManager && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Radnje</h2>
          <ElectroDailyLogControls logId={log.id} status={log.status} />
        </section>
      )}

      {log.revisions.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Revizije</h2>
          <ul className="space-y-1.5 text-sm text-muted">
            {log.revisions.map((r) => (
              <li key={r.id}>{r.createdAt.toLocaleString("hr-HR")} — {r.note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
