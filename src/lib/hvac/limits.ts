import "server-only";
import { db } from "@/lib/db";
import { PLAN_CONFIG, EXTRA_TECHNICIAN_EUR } from "./b2b-config";
import type { HvacPlan } from "@/generated/prisma/client";

/**
 * Package technician limits. Only ACTIVE technicians count. During the MVP,
 * going above the included limit is tracked (and an internal Varel admin must
 * approve/bill extras) — it is not auto-blocked, but the UI warns.
 */
export type TechnicianUsage = {
  active: number;
  included: number;
  additional: number;
  remaining: number;
  atLimit: boolean;
  overLimit: boolean;
  projectedExtraEur: number;
};

export async function technicianUsage(tenantId: string, plan: HvacPlan): Promise<TechnicianUsage> {
  const active = await db.hvacTechnician.count({ where: { tenantId, isActive: true, deletedAt: null } });
  const included = PLAN_CONFIG[plan].includedTechnicians;
  const additional = Math.max(0, active - included);
  return {
    active,
    included,
    additional,
    remaining: Math.max(0, included - active),
    atLimit: active >= included,
    overLimit: active > included,
    projectedExtraEur: additional * EXTRA_TECHNICIAN_EUR,
  };
}
