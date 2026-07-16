import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { parsePeriod, getLeaderboard } from "@/lib/bisneyscrm/dashboard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { PeriodFilter } from "@/components/bisneyscrm/dashboard/period-filter";
import { Leaderboard } from "@/components/bisneyscrm/dashboard/leaderboard";
import { DataTable, DetailCard } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const p = parsePeriod(sp);

  const [leaders, funnelRaw, referralRaw, staleLeads, staleCandidates] = await Promise.all([
    getLeaderboard(p.from, p.to),
    db.bisneysCandidate.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.bisneysReferral.groupBy({ by: ["referrerPersonId"], _count: { _all: true }, orderBy: { _count: { referrerPersonId: "desc" } }, take: 10 }),
    db.bisneysCompany.count({ where: { deletedAt: null, status: { in: ["NEW_LEAD", "QUALIFICATION", "FOLLOW_UP", "PITCH", "MEETING", "NURTURE", "NEGOTIATE"] }, OR: [{ lastActivityAt: { lt: new Date(Date.now() - 7 * 86400000) } }, { lastActivityAt: null }] } }),
    db.bisneysCandidate.count({ where: { deletedAt: null, status: { notIn: ["HIRED", "REJECTED", "CANDIDATE_DECLINED"] }, lastActivityAt: { lt: new Date(Date.now() - 14 * 86400000) } } }),
  ]);

  const funnel = new Map(funnelRaw.map((r) => [r.status, r._count._all]));
  const referrers = referralRaw.length
    ? await db.bisneysPerson.findMany({ where: { id: { in: referralRaw.map((r) => r.referrerPersonId) } }, select: { id: true, fullName: true } })
    : [];
  const nameOf = (id: string) => referrers.find((r) => r.id === id)?.fullName ?? id.slice(0, 8);

  return (
    <div className="max-w-5xl">
      <BisneysPageHeader title="Izvještaji" description={`Razdoblje: ${p.label}`}>
        <PeriodFilter period={p.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
      </BisneysPageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">Neaktivni leadovi (7d+)</div><div className="mt-2 text-2xl font-bold tabular-nums">{staleLeads}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">Neaktivni kandidati (14d+)</div><div className="mt-2 text-2xl font-bold tabular-nums">{staleCandidates}</div></div>
        <Link href="/api/bisneyscrm/export/companies" className="rounded-2xl border border-border bg-card p-4 hover:border-indigo-500/50"><div className="text-xs text-muted">Export</div><div className="mt-2 text-sm font-semibold">Tvrtke CSV</div></Link>
        <Link href="/api/bisneyscrm/export/candidates" className="rounded-2xl border border-border bg-card p-4 hover:border-indigo-500/50"><div className="text-xs text-muted">Export</div><div className="mt-2 text-sm font-semibold">Kandidati CSV</div></Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-muted">Performance zaposlenika (aktivnosti)</h2>
      <Leaderboard rows={leaders} columns={[
        { label: "Tvrtke", types: ["COMPANY_CREATED"] },
        { label: "Kandidati", types: ["CANDIDATE_CREATED"] },
        { label: "Pozivi", types: ["CALL_LOGGED"] },
        { label: "Komentari", types: ["COMMENT_ADDED"] },
        { label: "Follow-up", types: ["FOLLOW_UP_CREATED"] },
        { label: "Closed", types: ["DEAL_WON"] },
      ]} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Candidate funnel</h2>
          <DataTable headers={["Status", "Broj"]}>
            {CANDIDATE_STATUS_VALUES.map((s) => (
              <tr key={s} className="hover:bg-soft"><td className="px-4 py-2">{CANDIDATE_STATUS_LABELS[s]}</td><td className="px-4 py-2 text-right tabular-nums">{funnel.get(s) ?? 0}</td></tr>
            ))}
          </DataTable>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Referral performance</h2>
          <DetailCard title="Najbolji preporučitelji">
            {referralRaw.length === 0 ? <p className="text-sm text-muted">Još nema preporuka.</p> : (
              <ul className="space-y-2 text-sm">
                {referralRaw.map((r) => (
                  <li key={r.referrerPersonId} className="flex items-center justify-between">
                    <Link href={`/bisneyscrm/people/${r.referrerPersonId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{nameOf(r.referrerPersonId)}</Link>
                    <span className="text-muted">{r._count._all} preporuka</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
