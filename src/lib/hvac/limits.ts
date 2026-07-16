import "server-only";
import { db } from "@/lib/db";
import { PLAN_CONFIG, EXTRA_USER_EUR } from "./b2b-config";
import type { HvacPlan } from "@/generated/prisma/client";

/**
 * Package limits apply to USERS (login accounts), per the pricing model.
 * A technician who has no login does not consume a seat.
 *
 * Going above the included limit is tracked and surfaced (an internal Varel
 * admin approves/bills extras during the MVP) — it is not silently blocked.
 */
export type UserUsage = {
  active: number;
  included: number;
  additional: number;
  remaining: number;
  atLimit: boolean;
  overLimit: boolean;
  projectedExtraEur: number;
};

export async function userUsage(tenantId: string, plan: HvacPlan): Promise<UserUsage> {
  const active = await db.hvacTenantUser.count({ where: { tenantId, isActive: true } });
  const included = PLAN_CONFIG[plan].includedUsers;
  const additional = Math.max(0, active - included);
  return {
    active,
    included,
    additional,
    remaining: Math.max(0, included - active),
    atLimit: active >= included,
    overLimit: active > included,
    projectedExtraEur: additional * EXTRA_USER_EUR,
  };
}

/** Storage usage against the package allowance. */
export async function storageUsage(tenantId: string, plan: HvacPlan): Promise<{ usedBytes: number; limitGb: number; percent: number }> {
  const agg = await db.hvacFileAsset.aggregate({ where: { tenantId, archivedAt: null }, _sum: { size: true } });
  const usedBytes = agg._sum.size ?? 0;
  const limitGb = PLAN_CONFIG[plan].storageGb;
  return { usedBytes, limitGb, percent: Math.min(100, Math.round((usedBytes / (limitGb * 1024 ** 3)) * 100)) };
}
