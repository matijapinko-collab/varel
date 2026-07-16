import type { HvacReminderStatus } from "@/generated/prisma/client";

/**
 * Pure service-reminder scheduling helpers. No DB / no I/O so they can be unit
 * tested and reused by both the cron job and the admin UI.
 */

/** Days before the due date at which a reminder becomes "UPCOMING". */
export const UPCOMING_WINDOW_DAYS = 30;

/** Statuses the automatic recompute is allowed to change. Manual states
 *  (a human contacted / booked / postponed / rejected / completed the reminder)
 *  are never overwritten by the scheduler. */
const AUTO_STATES: HvacReminderStatus[] = ["FUTURE", "UPCOMING", "READY"];

const DAY = 86_400_000;

/** Whole days from `now` until `date` (negative = overdue). */
export function daysUntil(date: Date, now = new Date()): number {
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / DAY);
}

/** The scheduling bucket a due date falls into, ignoring manual states. */
export function autoStatusFor(nextServiceDate: Date, now = new Date()): HvacReminderStatus {
  const d = daysUntil(nextServiceDate, now);
  if (d <= 0) return "READY";
  if (d <= UPCOMING_WINDOW_DAYS) return "UPCOMING";
  return "FUTURE";
}

/**
 * Returns the status a reminder should have after recompute, or null when it
 * must stay unchanged (manual state, or already correct).
 */
export function recomputedStatus(
  current: HvacReminderStatus,
  nextServiceDate: Date,
  now = new Date(),
): HvacReminderStatus | null {
  if (!AUTO_STATES.includes(current)) return null;
  const next = autoStatusFor(nextServiceDate, now);
  return next === current ? null : next;
}

/** Next service date given the last service date and interval in months. */
export function computeNextServiceDate(lastServiceDate: Date, intervalMonths: number): Date {
  const d = new Date(lastServiceDate);
  d.setMonth(d.getMonth() + intervalMonths);
  return d;
}
