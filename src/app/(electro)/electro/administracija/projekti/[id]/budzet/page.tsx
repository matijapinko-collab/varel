import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import {
  ELECTRO_COST_CATEGORY_LABELS,
  plannedBudgetTotal,
  budgetUtilisation,
  estimatedMargin,
} from "@/lib/electro/budget";
import { ElectroBudgetForm, ElectroCostForm, ElectroGenerateReportButton } from "@/components/electro/finance/budget-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(n);
}

export default async function ElectroBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) redirect(`${ELECTRO_APP_BASE}/403`);
  const { id } = await params;

  if (!(await loadAccessibleProject(ctx, id))) notFound();
  const project = await db.electroProject.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { budget: true, costs: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();

  const b = project.budget;
  const planned = b
    ? plannedBudgetTotal({
        materialBudget: Number(b.materialBudget ?? 0),
        laborBudget: Number(b.laborBudget ?? 0),
        subcontractorBudget: Number(b.subcontractorBudget ?? 0),
        otherBudget: Number(b.otherBudget ?? 0),
        reserve: Number(b.reserve ?? 0),
      })
    : Number(project.plannedBudget ?? 0);
  const actual = project.costs.reduce((s, c) => s + Number(c.amount), 0);
  const util = budgetUtilisation(planned, actual);
  const margin = estimatedMargin(Number(project.contractValue ?? 0), actual);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/projekti/${project.id}`} className="text-sm text-muted hover:text-foreground">← {project.code}</Link>
      <h1 className="text-2xl font-black tracking-tight">Budžet i troškovi</h1>

      <section className={electroCardCls}>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><p className="text-sm text-muted">Ugovorena vrijednost</p><p className="text-lg font-bold">{eur(Number(project.contractValue ?? 0))}</p></div>
          <div><p className="text-sm text-muted">Planirani budžet</p><p className="text-lg font-bold">{eur(planned)}</p></div>
          <div><p className="text-sm text-muted">Stvarni trošak</p><p className="text-lg font-bold">{eur(actual)}</p></div>
          <div><p className="text-sm text-muted">Iskorištenost</p><p className={`text-lg font-bold ${util > 1 ? "text-red-600 dark:text-red-400" : ""}`}>{Number.isFinite(util) ? `${(util * 100).toFixed(0)}%` : "—"}</p></div>
        </div>
        <p className="mt-3 text-sm text-muted">Procijenjena marža (ugovor − trošak): <strong className={margin < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>{eur(margin)}</strong></p>
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Planirani budžet po kategoriji</h2>
        <ElectroBudgetForm
          projectId={project.id}
          initial={{
            materialBudget: b?.materialBudget?.toString() ?? "",
            laborBudget: b?.laborBudget?.toString() ?? "",
            subcontractorBudget: b?.subcontractorBudget?.toString() ?? "",
            otherBudget: b?.otherBudget?.toString() ?? "",
            reserve: b?.reserve?.toString() ?? "",
          }}
        />
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Troškovi</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {project.costs.map((c) => (
            <li key={c.id} className="flex justify-between gap-2 border-b border-black/5 py-1 last:border-0 dark:border-white/5">
              <span>{c.incurredOn.toLocaleDateString("hr-HR")} · {ELECTRO_COST_CATEGORY_LABELS[c.category]} · {c.description}</span>
              <strong>{eur(Number(c.amount))}</strong>
            </li>
          ))}
          {project.costs.length === 0 && <li className="text-muted">Nema evidentiranih troškova.</li>}
        </ul>
        <ElectroCostForm projectId={project.id} />
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Izvještaj</h2>
        <ElectroGenerateReportButton projectId={project.id} />
      </section>
    </div>
  );
}
