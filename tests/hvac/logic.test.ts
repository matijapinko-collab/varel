import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidOib } from "../../src/lib/hvac/oib.ts";
import { overlaps, layoutOverlaps, viewRange, isoDate, sameDay } from "../../src/lib/hvac/calendar.ts";

test("isValidOib: accepts a real 11-digit OIB", () => {
  assert.equal(isValidOib("12438213362"), true);
});

test("isValidOib: rejects wrong length / non-digits / bad checksum", () => {
  assert.equal(isValidOib("1234567890"), false);   // 10 digits
  assert.equal(isValidOib("123456789012"), false);  // 12 digits
  assert.equal(isValidOib("1243821336a"), false);   // non-digit
  assert.equal(isValidOib("12438213363"), false);   // checksum off by one
  assert.equal(isValidOib(""), false);
});

test("overlaps: detects overlapping time ranges", () => {
  const a1 = new Date("2026-07-16T09:00"), a2 = new Date("2026-07-16T10:00");
  assert.equal(overlaps(a1, a2, new Date("2026-07-16T09:30"), new Date("2026-07-16T10:30")), true);
  assert.equal(overlaps(a1, a2, new Date("2026-07-16T10:00"), new Date("2026-07-16T11:00")), false); // touching, not overlapping
  assert.equal(overlaps(a1, a2, new Date("2026-07-16T11:00"), new Date("2026-07-16T12:00")), false);
});

test("layoutOverlaps: assigns two overlapping events to separate lanes", () => {
  const events = [
    { id: "a", startAt: new Date("2026-07-16T09:00"), endAt: new Date("2026-07-16T10:00") },
    { id: "b", startAt: new Date("2026-07-16T09:30"), endAt: new Date("2026-07-16T10:30") },
    { id: "c", startAt: new Date("2026-07-16T11:00"), endAt: new Date("2026-07-16T12:00") },
  ];
  const map = layoutOverlaps(events);
  const a = map.get("a")!, b = map.get("b")!, c = map.get("c")!;
  assert.notEqual(a.lane, b.lane);   // a and b overlap → different lanes
  assert.equal(a.lanes, 2);
  assert.equal(b.lanes, 2);
  assert.equal(c.lane, 0);           // c is alone
  assert.equal(c.lanes, 1);
});

test("viewRange: day view spans a single day", () => {
  const { from, to } = viewRange("dan", new Date("2026-07-16T13:00"));
  assert.equal(isoDate(from), "2026-07-16");
  assert.ok(sameDay(from, to));
});

test("viewRange: week view spans 7 days from Monday", () => {
  const { from, to } = viewRange("tjedan", new Date("2026-07-16")); // Thursday
  assert.equal(from.getDay(), 1);    // Monday
  assert.equal(isoDate(from), "2026-07-13");
  assert.equal(isoDate(to), "2026-07-19");
});
