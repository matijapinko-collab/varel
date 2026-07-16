import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { RefreshCw } from "lucide-react";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { PeriodFilter } from "@/components/bisneyscrm/dashboard/period-filter";
import { KpiCard } from "@/components/bisneyscrm/dashboard/kpi-card";
import { ActivityFeed } from "@/components/bisneyscrm/dashboard/activity-feed";
import { parsePeriod, getKpiData, sumTypes, totalCount, delta, candidateStatusCounts } from "@/lib/bisneyscrm/dashboard";
import { money } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function BisneysDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireBisneysUser();
  const sp = await searchParams;
  const p = parsePeriod(sp);

  const [k, statusCur, connection, activities] = await Promise.all([
    getKpiData(p),
    candidateStatusCounts(p.from, p.to),
    db.bisneysTrelloConnection.findFirst().catch(() => null),
    db.bisneysActivity.findMany({ orderBy: { occurredAt: "desc" }, take: 15 }),
  ]);

  const status = connection?.status ?? "DISCONNECTED";
  const lastSynced = connection?.lastSyncedAt ? connection.lastSyncedAt.toLocaleString("hr-HR") : "—";
  const today = new Date().toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const kpis = [
    { label: "Nove tvrtke", value: k.companiesCreated, deltaPct: delta(k.companiesCreated, k.companiesCreatedPrev), href: "/bisneyscrm/companies" },
    { label: "Novi kandidati", value: k.candidatesCreated, deltaPct: delta(k.candidatesCreated, k.candidatesCreatedPrev), href: "/bisneyscrm/candidates" },
    { label: "Ukupne aktivnosti", value: totalCount(k.cur), deltaPct: delta(totalCount(k.cur), totalCount(k.prev)), href: "/bisneyscrm/activities" },
    { label: "Pozivi", value: k.cur.CALL_LOGGED ?? 0, deltaPct: delta(k.cur.CALL_LOGGED ?? 0, k.prev.CALL_LOGGED ?? 0) },
    { label: "Follow-upovi", value: k.cur.FOLLOW_UP_CREATED ?? 0, deltaPct: delta(k.cur.FOLLOW_UP_CREATED ?? 0, k.prev.FOLLOW_UP_CREATED ?? 0) },
    { label: "Pitch prezentacije", value: sumTypes(k.cur, ["PITCH_PRESENTED", "PITCH_SENT"]), deltaPct: delta(sumTypes(k.cur, ["PITCH_PRESENTED", "PITCH_SENT"]), sumTypes(k.prev, ["PITCH_PRESENTED", "PITCH_SENT"])) },
    { label: "Sastanci", value: sumTypes(k.cur, ["MEETING_COMPLETED", "MEETING_SCHEDULED"]), deltaPct: delta(sumTypes(k.cur, ["MEETING_COMPLETED", "MEETING_SCHEDULED"]), sumTypes(k.prev, ["MEETING_COMPLETED", "MEETING_SCHEDULED"])) },
    { label: "Zatvoreni poslovi", value: k.cur.DEAL_WON ?? 0, deltaPct: delta(k.cur.DEAL_WON ?? 0, k.prev.DEAL_WON ?? 0) },
    { label: "Poslani klijentu", value: statusCur.SENT_TO_CLIENT ?? 0 },
    { label: "Zaposleni", value: statusCur.HIRED ?? 0 },
    { label: "Vrijednost pipelinea", value: money(k.pipelineValue), hint: "Zbroj deal value otvorenih tvrtki" },
    { label: "Aktivna upozorenja", value: k.activeAlerts, href: "/bisneyscrm/notifications" },
  ];

  return (
    <div>
      <BisneysPageHeader title={`Dobrodošli, ${user.username}`} description={today}>
        <PeriodFilter period={p.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
      </BisneysPageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status === "SYNCED" ? "bg-green-500" : status === "ERROR" ? "bg-red-500" : "bg-muted"}`} />
          Trello: <span className="font-medium">{status}</span>
        </span>
        <span className="flex items-center gap-2 text-muted"><RefreshCw size={14} /> Zadnja sinkronizacija: {lastSynced}</span>
        <span className="text-muted">Razdoblje: <span className="font-medium">{p.label}</span></span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-muted">Nedavne aktivnosti</h2>
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
