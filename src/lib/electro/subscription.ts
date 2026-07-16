import type { ElectroSubscriptionStatus } from "@/generated/prisma/client";

/**
 * Pure subscription/trial helpers (brief §5). Kept side-effect-free so the
 * status logic is unit-testable without a database.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days of trial left, never negative. 0 means expired or no trial. */
export function trialDaysRemaining(trialEndsAt: Date | null | undefined, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / MS_PER_DAY));
}

/**
 * The status to enforce right now: a TRIAL whose trialEndsAt has passed is
 * treated as EXPIRED even before a background job persists the transition.
 */
export function effectiveSubscriptionStatus(
  sub: { status: ElectroSubscriptionStatus; trialEndsAt: Date | null },
  now: Date = new Date()
): ElectroSubscriptionStatus {
  if (sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt.getTime() < now.getTime()) {
    return "EXPIRED";
  }
  return sub.status;
}

/** Statuses that allow normal day-to-day use of the app. */
export function isOperational(status: ElectroSubscriptionStatus): boolean {
  return status === "TRIAL" || status === "ACTIVE";
}
