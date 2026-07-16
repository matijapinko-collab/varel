import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { PeriodFilter } from "@/components/bisneyscrm/dashboard/period-filter";
import { KpiCard } from "@/components/bisneyscrm/dashboard/kpi-card";
import { Leaderboard } from "@/components/bisneyscrm/dashboard/leaderboard";
import { parsePeriod, getKpiData, getLeaderboard, candidateStatusCounts, sumTypes, delta } from "@/lib/bisneyscrm/dashboard";

export const dynamic = "force-dynamic";

export default async function DeliveryDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const p = parsePeriod(sp);
  const [k, statusCur, leaders, totalCandidates] = await Promise.all([
    getKpiData(p),
    candidateStatusCounts(p.from, p.to),
    getLeaderboard(p.from, p.to),
    db.bisneysCandidate.count({ where: { deletedAt: null } }),
  ]);

  const s = (key: string) => statusCur[key] ?? 0;
  const calls = sumTypes(k.cur, ["CALL_LOGGED"]);

  const kpis = [
    { label: "Ukupno kandidata", value: totalCandidates, href: "/bisneyscrm/candidates" },
    { label: "Novi kandidati", value: k.candidatesCreated, deltaPct: delta(k.candidatesCreated, k.candidatesCreatedPrev) },
    { label: "Kontaktirani", value: s("CONTACTED") },
    { label: "Prvi intervjui", value: s("FIRST_CALL") },
    { label: "Kvalificirani", value: s("QUALIFIED") },
    { label: "Drugi intervjui", value: s("SECOND_INTERVIEW") },
    { label: "Poslani klijentu", value: s("SENT_TO_CLIENT") },
    { label: "Intervju kod klijenta", value: s("CLIENT_INTERVIEW") },
    { label: "Ponude poslane", value: s("OFFERED") },
    { label: "Zaposleni", value: s("HIRED") },
    { label: "Odbijeni", value: s("REJECTED") },
    { label: "Odustali", value: s("CANDIDATE_DECLINED") },
    { label: "Na čekanju", value: s("ON_HOLD") },
    { label: "Pozivi", value: calls, deltaPct: delta(calls, sumTypes(k.prev, ["CALL_LOGGED"])) },
    { label: "Follow-upovi", value: sumTypes(k.cur, ["FOLLOW_UP_CREATED"]) },
  ];

  return (
    <div>
      <BisneysPageHeader title="Delivery" description={`Razdoblje: ${p.label}`}>
        <PeriodFilter period={p.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
      </BisneysPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Delivery leaderboard</h2>
      <Leaderboard
        rows={leaders}
        columns={[
          { label: "Novi kandidati", types: ["CANDIDATE_CREATED"] },
          { label: "Pozivi", types: ["CALL_LOGGED"] },
          { label: "Promjene statusa", types: ["CANDIDATE_STATUS_CHANGED"] },
          { label: "Komentari", types: ["COMMENT_ADDED"] },
          { label: "Follow-up", types: ["FOLLOW_UP_CREATED"] },
        ]}
      />
    </div>
  );
}
