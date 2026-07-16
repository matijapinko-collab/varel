import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { PeriodFilter } from "@/components/bisneyscrm/dashboard/period-filter";
import { KpiCard } from "@/components/bisneyscrm/dashboard/kpi-card";
import { Leaderboard } from "@/components/bisneyscrm/dashboard/leaderboard";
import { parsePeriod, getKpiData, getLeaderboard, sumTypes, delta } from "@/lib/bisneyscrm/dashboard";
import { money } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function SalesDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const p = parsePeriod(sp);
  const [k, leaders] = await Promise.all([getKpiData(p), getLeaderboard(p.from, p.to)]);

  const closed = k.cur.DEAL_WON ?? 0;
  const conversion = k.companiesCreated > 0 ? Math.round((closed / k.companiesCreated) * 100) : 0;
  const g = (t: Parameters<typeof sumTypes>[1]) => sumTypes(k.cur, t);
  const gp = (t: Parameters<typeof sumTypes>[1]) => sumTypes(k.prev, t);

  const kpis = [
    { label: "Nove tvrtke", value: k.companiesCreated, deltaPct: delta(k.companiesCreated, k.companiesCreatedPrev) },
    { label: "Pozivi", value: g(["CALL_LOGGED"]), deltaPct: delta(g(["CALL_LOGGED"]), gp(["CALL_LOGGED"])) },
    { label: "Komentari", value: g(["COMMENT_ADDED"]), deltaPct: delta(g(["COMMENT_ADDED"]), gp(["COMMENT_ADDED"])) },
    { label: "Follow-upovi", value: g(["FOLLOW_UP_CREATED"]), deltaPct: delta(g(["FOLLOW_UP_CREATED"]), gp(["FOLLOW_UP_CREATED"])) },
    { label: "Pitch prezentacije", value: g(["PITCH_PRESENTED", "PITCH_SENT"]), deltaPct: delta(g(["PITCH_PRESENTED", "PITCH_SENT"]), gp(["PITCH_PRESENTED", "PITCH_SENT"])) },
    { label: "Sastanci", value: g(["MEETING_COMPLETED", "MEETING_SCHEDULED"]), deltaPct: delta(g(["MEETING_COMPLETED", "MEETING_SCHEDULED"]), gp(["MEETING_COMPLETED", "MEETING_SCHEDULED"])) },
    { label: "Zatvoreni poslovi", value: closed, deltaPct: delta(closed, k.prev.DEAL_WON ?? 0) },
    { label: "Conversion rate", value: `${conversion}%`, hint: "Zatvoreni poslovi / nove tvrtke u razdoblju" },
    { label: "Vrijednost pipelinea", value: money(k.pipelineValue) },
    { label: "Vrijednost zatvorenih", value: money(k.closedValue) },
  ];

  return (
    <div>
      <BisneysPageHeader title="Sales" description={`Razdoblje: ${p.label}`}>
        <PeriodFilter period={p.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
      </BisneysPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Sales leaderboard</h2>
      <Leaderboard
        rows={leaders}
        columns={[
          { label: "Nove firme", types: ["COMPANY_CREATED"] },
          { label: "Pozivi", types: ["CALL_LOGGED"] },
          { label: "Komentari", types: ["COMMENT_ADDED"] },
          { label: "Follow-up", types: ["FOLLOW_UP_CREATED"] },
          { label: "Pitch", types: ["PITCH_PRESENTED", "PITCH_SENT"] },
          { label: "Sastanci", types: ["MEETING_COMPLETED", "MEETING_SCHEDULED"] },
          { label: "Closed", types: ["DEAL_WON"] },
        ]}
      />
    </div>
  );
}
