import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdvancedWhere, parseFilterParam } from "../../src/lib/bisneyscrm/candidates/filter-core.ts";

test("buildAdvancedWhere: null/empty group yields empty filter", () => {
  const r = buildAdvancedWhere(null);
  assert.deepEqual(r.where, {});
  assert.equal(r.professionQuery, null);
  assert.equal(r.poolId, null);
});

test("buildAdvancedWhere: single leaf is flattened (no AND/OR wrapper)", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "profileStatus", op: "eq", value: "ACTIVE" }] });
  assert.deepEqual(r.where, { profileStatus: "ACTIVE" });
});

test("buildAdvancedWhere: multiple leaves combine under AND", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [
    { field: "profileStatus", op: "eq", value: "ACTIVE" },
    { field: "fieldWorkWilling", op: "isTrue" },
  ] });
  assert.ok(Array.isArray((r.where as Record<string, unknown>).AND));
  assert.equal((r.where as { AND: unknown[] }).AND.length, 2);
});

test("buildAdvancedWhere: OR combinator", () => {
  const r = buildAdvancedWhere({ combinator: "OR", conditions: [
    { field: "profileStatus", op: "eq", value: "ACTIVE" },
    { field: "profileStatus", op: "eq", value: "PASSIVE" },
  ] });
  assert.ok(Array.isArray((r.where as Record<string, unknown>).OR));
});

test("buildAdvancedWhere: neq builds a not clause", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "profileStatus", op: "neq", value: "ARCHIVED" }] });
  assert.deepEqual(r.where, { profileStatus: { not: "ARCHIVED" } });
});

test("buildAdvancedWhere: numeric gte/lte", () => {
  const gte = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "totalExperienceMonths", op: "gte", value: "24" }] });
  assert.deepEqual(gte.where, { totalExperienceMonths: { gte: 24 } });
  const lte = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "expectedSalaryMax", op: "lte", value: "2000" }] });
  assert.deepEqual(lte.where, { expectedSalaryMax: { lte: 2000 } });
});

test("buildAdvancedWhere: boolean isTrue/isFalse", () => {
  const t = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "shiftWork", op: "isTrue" }] });
  assert.deepEqual(t.where, { shiftWork: true });
  const f = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "shiftWork", op: "isFalse" }] });
  assert.deepEqual(f.where, { shiftWork: false });
});

test("buildAdvancedWhere: tag uses array has", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "tag", op: "hasTag", value: "senior" }] });
  assert.deepEqual(r.where, { tags: { has: "senior" } });
});

test("buildAdvancedWhere: special fields surface separately, not in where", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [
    { field: "profession", op: "contains", value: "HVAC" },
    { field: "pool", op: "eq", value: "pool_1" },
    { field: "shiftWork", op: "isTrue" },
  ] });
  assert.equal(r.professionQuery, "HVAC");
  assert.equal(r.poolId, "pool_1");
  assert.deepEqual(r.where, { shiftWork: true }); // only the non-special leaf
});

test("buildAdvancedWhere: unknown fields are ignored", () => {
  const r = buildAdvancedWhere({ combinator: "AND", conditions: [{ field: "nonexistent", op: "eq", value: "x" }] });
  assert.deepEqual(r.where, {});
});

test("parseFilterParam: valid encoded JSON round-trips", () => {
  const raw = encodeURIComponent(JSON.stringify({ combinator: "OR", conditions: [{ field: "city", op: "contains", value: "Zagreb" }] }));
  const g = parseFilterParam(raw);
  assert.equal(g?.combinator, "OR");
  assert.equal(g?.conditions.length, 1);
});

test("parseFilterParam: rejects malformed / missing", () => {
  assert.equal(parseFilterParam(undefined), null);
  assert.equal(parseFilterParam("not-json"), null);
  assert.equal(parseFilterParam(encodeURIComponent(JSON.stringify({ combinator: "XOR", conditions: [] }))), null);
});
