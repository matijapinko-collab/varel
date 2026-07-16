import "server-only";
import { db } from "@/lib/db";
import type { BisneysActivityType } from "@/generated/prisma/client";

/**
 * Dashboard computation (brief §20–25, §30–33): time-window parsing with a
 * comparable previous period, activity-type counts (one groupBy per window),
 * entity/pipeline aggregates and leaderboard pivots. Kept out of the React
 * components — pages call these and render.
 */

export type Period = { key: string; label: string; from: Date; to: Date; prevFrom: Date; prevTo: Date };

export const PERIOD_OPTIONS: { key: string; label: string }[] = [
  { key: "today", label: "Danas" },
  { key: "yesterday", label: "Jučer" },
  { key: "this_week", label: "Ovaj tjedan" },
  { key: "last_week", label: "Prošli tjedan" },
  { key: "this_month", label: "Ovaj mjesec" },
  { key: "custom", label: "Prilagođeno" },
];

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
/** Monday as the first day of the week. */
function startOfWeek(d: Date): Date { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; return addDays(x, -day); }
function startOfMonth(d: Date): Date { const x = startOfDay(d); x.setDate(1); return x; }

export function parsePeriod(sp: Record<string, string | string[] | undefined>): Period {
  const key = typeof sp.period === "string" ? sp.period : "this_week";
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (key) {
    case "today": from = startOfDay(now); to = addDays(from, 1); break;
    case "yesterday": to = startOfDay(now); from = addDays(to, -1); break;
    case "last_week": { const thisW = startOfWeek(now); from = addDays(thisW, -7); to = thisW; break; }
    case "this_month": from = startOfMonth(now); to = addDays(startOfMonth(now), 32); to = startOfMonth(to); break;
    case "custom": {
      const f = typeof sp.from === "string" ? new Date(sp.from) : null;
      const t = typeof sp.to === "string" ? new Date(sp.to) : null;
      from = f && !isNaN(f.getTime()) ? startOfDay(f) : startOfWeek(now);
      to = t && !isNaN(t.getTime()) ? addDays(startOfDay(t), 1) : addDays(now, 1);
      break;
    }
    case "this_week":
    default: from = startOfWeek(now); to = addDays(now, 1); break;
  }

  const len = Math.max(1, to.getTime() - from.getTime());
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - len);
  const label = PERIOD_OPTIONS.find((o) => o.key === key)?.label ?? "Ovaj tjedan";
  return { key, label, from, to, prevFrom, prevTo };
}

/** All activity-type counts for a window in a single query. */
async function activityCounts(from: Date, to: Date): Promise<Record<string, number>> {
  const rows = await db.bisneysActivity.groupBy({
    by: ["type"],
    where: { occurredAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.type] = r._count._all;
  return map;
}

export type KpiData = {
  cur: Record<string, number>;
  prev: Record<string, number>;
  companiesCreated: number; companiesCreatedPrev: number;
  candidatesCreated: number; candidatesCreatedPrev: number;
  pipelineValue: number; closedValue: number;
  activeAlerts: number;
};

export async function getKpiData(p: Period): Promise<KpiData> {
  const [cur, prev, companiesCreated, companiesCreatedPrev, candidatesCreated, candidatesCreatedPrev, pipe, closed, activeAlerts] =
    await Promise.all([
      activityCounts(p.from, p.to),
      activityCounts(p.prevFrom, p.prevTo),
      db.bisneysCompany.count({ where: { deletedAt: null, createdAt: { gte: p.from, lt: p.to } } }),
      db.bisneysCompany.count({ where: { deletedAt: null, createdAt: { gte: p.prevFrom, lt: p.prevTo } } }),
      db.bisneysCandidate.count({ where: { deletedAt: null, createdAt: { gte: p.from, lt: p.to } } }),
      db.bisneysCandidate.count({ where: { deletedAt: null, createdAt: { gte: p.prevFrom, lt: p.prevTo } } }),
      db.bisneysCompany.aggregate({ _sum: { dealValue: true }, where: { deletedAt: null, status: { notIn: ["CLOSED", "LOST", "ARCHIVED"] } } }),
      db.bisneysCompany.aggregate({ _sum: { dealValue: true }, where: { deletedAt: null, status: "CLOSED" } }),
      db.bisneysNotification.count({ where: { status: "UNREAD" } }),
    ]);

  return {
    cur, prev,
    companiesCreated, companiesCreatedPrev,
    candidatesCreated, candidatesCreatedPrev,
    pipelineValue: Number(pipe._sum.dealValue ?? 0),
    closedValue: Number(closed._sum.dealValue ?? 0),
    activeAlerts,
  };
}

export function sumTypes(map: Record<string, number>, types: BisneysActivityType[]): number {
  return types.reduce((acc, t) => acc + (map[t] ?? 0), 0);
}

export function totalCount(map: Record<string, number>): number {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

/** Candidate status-transition counts (by target status) within a window. */
export async function candidateStatusCounts(from: Date, to: Date): Promise<Record<string, number>> {
  const rows = await db.bisneysCandidateStatusHistory.groupBy({
    by: ["toStatus"],
    where: { createdAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.toStatus] = r._count._all;
  return map;
}

/** % change vs the previous period; null when there is no baseline. */
export function delta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/* ---------------- leaderboards ---------------- */

export type LeaderRow = { actor: string; counts: Record<string, number>; total: number };

/**
 * Groups activities by actor for the window and pivots counts per type.
 * Employees appear by their Trello member / CRM display name (brief §24: Trello
 * members exist as analytics-only profiles).
 */
export async function getLeaderboard(from: Date, to: Date): Promise<LeaderRow[]> {
  const rows = await db.bisneysActivity.groupBy({
    by: ["actorName", "type"],
    where: { occurredAt: { gte: from, lt: to }, actorName: { not: null } },
    _count: { _all: true },
  });
  const byActor = new Map<string, LeaderRow>();
  for (const r of rows) {
    const actor = r.actorName ?? "—";
    const row = byActor.get(actor) ?? { actor, counts: {}, total: 0 };
    row.counts[r.type] = (row.counts[r.type] ?? 0) + r._count._all;
    row.total += r._count._all;
    byActor.set(actor, row);
  }
  return [...byActor.values()].sort((a, b) => b.total - a.total);
}
