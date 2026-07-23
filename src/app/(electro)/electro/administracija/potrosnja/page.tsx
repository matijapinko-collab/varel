import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_CONSUMPTION_STATUS_LABELS } from "@/lib/electro/warehouse-labels";
import {
  ElectroReportConsumptionForm,
  ElectroConfirmConsumptionForm,
} from "@/components/electro/materials/material-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  PARTIALLY_CONFIRMED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
  CANCELLED: "bg-zinc-500/15 text-zinc-500",
  DRAFT: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

export default async function ElectroConsumptionPage() {
  const ctx = await requireElectroContext();
  const isManager = canManageProjects(ctx);

  const [projects, items, warehouses] = await Promise.all([
    db.electroProject.findMany({ where: { ...accessibleProjectsWhere(ctx), isArchived: false }, orderBy: { createdAt: "desc" } }),
    db.electroItem.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
    db.electroWarehouse.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { code: "asc" } }),
  ]);
  const projectIds = projects.map((p) => p.id);

  const consumptions = await db.electroMaterialConsumption.findMany({
    where: { companyId: ctx.company.id, projectId: { in: projectIds } },
    include: { item: true, project: true, warehouse: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Potrošnja materijala</h1>

      {projects.length > 0 && items.length > 0 && warehouses.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Prijavi potrošnju</h2>
          <ElectroReportConsumptionForm
            projects={projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))}
            items={items.map((i) => ({ id: i.id, label: `${i.sku} · ${i.name}` }))}
            warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} · ${w.name}` }))}
          />
          <p className="mt-2 text-xs text-muted">Prijava ne umanjuje zalihu odmah — konačni otpis nastaje tek nakon potvrde voditelja.</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-bold">Evidencija potrošnje</h2>
        <div className="space-y-2">
          {consumptions.map((c) => (
            <div key={c.id} className={`${electroCardCls} !p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {c.item.sku} · {c.item.name} — {Number(c.quantity)} {c.item.unit}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[c.status]}`}>{ELECTRO_CONSUMPTION_STATUS_LABELS[c.status]}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {c.project.code} · {c.warehouse.code}
                    {c.confirmedQuantity != null && ` · potvrđeno ${Number(c.confirmedQuantity)} ${c.item.unit}`}
                    {c.comment && ` · ${c.comment}`}
                  </p>
                </div>
                {isManager && c.status === "PENDING_CONFIRMATION" && (
                  <ElectroConfirmConsumptionForm consumptionId={c.id} requested={Number(c.quantity)} unit={c.item.unit} />
                )}
              </div>
            </div>
          ))}
          {consumptions.length === 0 && <p className="text-sm text-muted">Još nema prijavljene potrošnje.</p>}
        </div>
      </section>
    </div>
  );
}
