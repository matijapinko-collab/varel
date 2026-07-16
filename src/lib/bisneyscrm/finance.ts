import "server-only";
import { db } from "@/lib/db";
import type { BisneysSalesStatus } from "@/generated/prisma/client";

/**
 * Financial pipeline analytics (brief §50). Companies carry the deal value in
 * the MVP (edited + audited on the company profile), so the pipeline is derived
 * from BisneysCompany.dealValue + status + closeProbability, with the deals
 * table used for the closed-deal breakdown.
 */

const OPEN_EXCLUDE: BisneysSalesStatus[] = ["CLOSED", "LOST", "ARCHIVED"];

export type FinanceOverview = {
  pipelineValue: number;
  weightedPipeline: number;
  closedValue: number;
  avgDealValue: number;
  openCount: number;
  closedCount: number;
  lostCount: number;
  conversionByCount: number;
  conversionByValue: number;
  byStatus: { status: BisneysSalesStatus; count: number; value: number }[];
  byOwner: { owner: string; count: number; value: number }[];
};

export async function getFinanceOverview(): Promise<FinanceOverview> {
  const companies = await db.bisneysCompany.findMany({
    where: { deletedAt: null },
    select: { status: true, dealValue: true, closeProbability: true, ownerId: true },
  });

  let pipelineValue = 0, weightedPipeline = 0, closedValue = 0, lostValue = 0;
  let openCount = 0, closedCount = 0, lostCount = 0;
  const byStatus = new Map<BisneysSalesStatus, { count: number; value: number }>();
  const byOwner = new Map<string, { count: number; value: number }>();

  for (const c of companies) {
    const v = Number(c.dealValue ?? 0);
    const st = byStatus.get(c.status) ?? { count: 0, value: 0 };
    st.count++; st.value += v; byStatus.set(c.status, st);

    if (c.status === "CLOSED") { closedValue += v; closedCount++; }
    else if (c.status === "LOST") { lostValue += v; lostCount++; }
    else if (!OPEN_EXCLUDE.includes(c.status)) {
      pipelineValue += v;
      weightedPipeline += v * ((c.closeProbability ?? 0) / 100);
      openCount++;
    }

    if (v > 0) {
      const key = c.ownerId ?? "—";
      const o = byOwner.get(key) ?? { count: 0, value: 0 };
      o.count++; o.value += v; byOwner.set(key, o);
    }
  }

  const decided = closedCount + lostCount;
  return {
    pipelineValue, weightedPipeline, closedValue,
    avgDealValue: closedCount ? Math.round(closedValue / closedCount) : 0,
    openCount, closedCount, lostCount,
    conversionByCount: decided ? Math.round((closedCount / decided) * 100) : 0,
    conversionByValue: closedValue + lostValue ? Math.round((closedValue / (closedValue + lostValue)) * 100) : 0,
    byStatus: [...byStatus.entries()].map(([status, v]) => ({ status, ...v })).sort((a, b) => b.value - a.value),
    byOwner: [...byOwner.entries()].map(([owner, v]) => ({ owner, ...v })).sort((a, b) => b.value - a.value),
  };
}
