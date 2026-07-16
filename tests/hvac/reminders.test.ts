import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, autoStatusFor, recomputedStatus, computeNextServiceDate, UPCOMING_WINDOW_DAYS } from "../../src/lib/hvac/reminders.ts";

const now = new Date("2026-07-16T09:00:00Z");

test("daysUntil: positive future, negative overdue, zero today", () => {
  assert.equal(daysUntil(new Date("2026-07-26"), now), 10);
  assert.equal(daysUntil(new Date("2026-07-11"), now), -5);
  assert.equal(daysUntil(new Date("2026-07-16"), now), 0);
});

test("autoStatusFor: READY when due/overdue", () => {
  assert.equal(autoStatusFor(new Date("2026-07-16"), now), "READY");
  assert.equal(autoStatusFor(new Date("2026-07-01"), now), "READY");
});

test("autoStatusFor: UPCOMING within the window", () => {
  assert.equal(autoStatusFor(new Date("2026-07-26"), now), "UPCOMING");
  assert.equal(autoStatusFor(new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 86400000), now), "UPCOMING");
});

test("autoStatusFor: FUTURE beyond the window", () => {
  assert.equal(autoStatusFor(new Date("2026-12-01"), now), "FUTURE");
});

test("recomputedStatus: never overwrites a manual state", () => {
  assert.equal(recomputedStatus("CONTACTED", new Date("2026-01-01"), now), null);
  assert.equal(recomputedStatus("BOOKED", new Date("2026-01-01"), now), null);
  assert.equal(recomputedStatus("COMPLETED", new Date("2026-01-01"), now), null);
});

test("recomputedStatus: promotes FUTURE→UPCOMING→READY, returns null when unchanged", () => {
  assert.equal(recomputedStatus("FUTURE", new Date("2026-07-26"), now), "UPCOMING");
  assert.equal(recomputedStatus("UPCOMING", new Date("2026-07-16"), now), "READY");
  assert.equal(recomputedStatus("READY", new Date("2026-07-11"), now), null); // already READY
  assert.equal(recomputedStatus("FUTURE", new Date("2026-12-01"), now), null); // still FUTURE
});

test("computeNextServiceDate: adds interval months", () => {
  const next = computeNextServiceDate(new Date("2026-07-16"), 12);
  assert.equal(next.getFullYear(), 2027);
  assert.equal(next.getMonth(), 6); // July (0-indexed)
});
