import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { getFinanceOverview } from "@/lib/bisneyscrm/finance";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { KpiCard } from "@/components/bisneyscrm/dashboard/kpi-card";
import { DataTable, StatusPill } from "@/components/bisneyscrm/shared/ui";
import { SALES_STATUS_LABELS } from "@/lib/bisneyscrm/trello/mapping";
import { money } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  await requireBisneysUser();
  const f = await getFinanceOverview();

  const users = await db.bisneysUser.findMany({ select: { id: true, username: true } });
  const nameOf = (id: string) => (id === "—" ? "Nepoznato" : users.find((u) => u.id === id)?.username ?? id.slice(0, 8));

  const kpis = [
    { label: "Vrijednost pipelinea", value: money(f.pipelineValue) },
    { label: "Ponderirani pipeline", value: money(f.weightedPipeline), hint: "Zbroj deal value × vjerojatnost" },
    { label: "Zatvoreni prihod", value: money(f.closedValue) },
    { label: "Prosječna vrijednost", value: money(f.avgDealValue) },
    { label: "Otvoreni dealovi", value: f.openCount },
    { label: "Zatvoreni dealovi", value: f.closedCount },
    { label: "Conversion (broj)", value: `${f.conversionByCount}%`, hint: "Zatvoreni / (zatvoreni + izgubljeni)" },
    { label: "Conversion (vrijednost)", value: `${f.conversionByValue}%` },
  ];

  return (
    <div className="max-w-5xl">
      <BisneysPageHeader title="Financije" description="Pipeline vrijednost i prihod." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Pipeline po fazi</h2>
          <DataTable headers={["Faza", "Broj", "Vrijednost"]} empty={f.byStatus.length === 0 ? "Nema podataka." : undefined}>
            {f.byStatus.map((r) => (
              <tr key={r.status} className="hover:bg-soft">
                <td className="px-4 py-3"><StatusPill status={r.status} label={SALES_STATUS_LABELS[r.status]} /></td>
                <td className="px-4 py-3 tabular-nums">{r.count}</td>
                <td className="px-4 py-3 tabular-nums">{money(r.value)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Vrijednost po vlasniku</h2>
          <DataTable headers={["Vlasnik", "Dealovi", "Vrijednost"]} empty={f.byOwner.length === 0 ? "Nema podataka." : undefined}>
            {f.byOwner.map((r) => (
              <tr key={r.owner} className="hover:bg-soft">
                <td className="px-4 py-3 font-medium">{nameOf(r.owner)}</td>
                <td className="px-4 py-3 tabular-nums">{r.count}</td>
                <td className="px-4 py-3 tabular-nums">{money(r.value)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </div>
  );
}
