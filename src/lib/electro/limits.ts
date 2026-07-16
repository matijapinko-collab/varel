import "server-only";
import { db } from "@/lib/db";
import { limitReachedMessage } from "./limit-messages";

/**
 * Plan-limit enforcement (brief §5, §72). Limits live in ElectroPlanLimit rows
 * — never hardcoded — and are checked on the BACKEND before creating new
 * entities. On a reached limit nothing is deleted or hidden; only creation of
 * new items is blocked, with a clear Croatian message and an upgrade hint.
 * The pure message helper lives in ./limit-messages (db-free, testable).
 */

export { limitReachedMessage };

export async function getIntLimit(planId: string, key: string): Promise<number | null> {
  const row = await db.electroPlanLimit.findUnique({ where: { planId_key: { planId, key } } });
  return row?.intValue ?? null;
}

export async function getBoolLimit(planId: string, key: string): Promise<boolean> {
  const row = await db.electroPlanLimit.findUnique({ where: { planId_key: { planId, key } } });
  return row?.boolValue ?? false;
}

/**
 * Returns the §72 error message when creating one more item would exceed the
 * plan's numeric limit, or null when allowed. A missing limit row means
 * unlimited (Enterprise custom arrangements).
 */
export async function checkIntLimit(
  planId: string,
  key: string,
  currentCount: number
): Promise<string | null> {
  const limit = await getIntLimit(planId, key);
  if (limit === null) return null;
  return currentCount >= limit ? limitReachedMessage(key, limit) : null;
}
