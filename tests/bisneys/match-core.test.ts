import { test } from "node:test";
import assert from "node:assert/strict";
import { computeJobMatch, parseSalary, type JobLite, type CandidateLite } from "../../src/lib/bisneyscrm/candidates/match-core.ts";

const baseJob: JobLite = { professionId: "p1", location: "Split", salary: "2000 EUR", requirements: null, languages: null, description: null };
const baseCand: CandidateLite = {
  primaryProfessionId: "p1", city: "Split", expectedSalaryMax: 1800,
  availabilityStatus: "AVAILABLE_IMMEDIATELY", relocationPreference: null,
  totalExperienceMonths: 72, fieldWorkWilling: true, professionIds: ["p1"],
};

test("parseSalary: extracts figure from free text, handles thousands/decimals", () => {
  assert.equal(parseSalary("2000 EUR"), 2000);
  assert.equal(parseSalary("1.500 kn"), 1500);
  assert.equal(parseSalary("do 2500€ neto"), 2500);
  assert.equal(parseSalary(null), null);
  assert.equal(parseSalary("po dogovoru"), null);
});

test("computeJobMatch: perfect candidate scores very high", () => {
  const r = computeJobMatch(baseCand, baseJob, new Set(["p1"]));
  assert.ok(r.score >= 90, `expected >=90, got ${r.score}`);
  assert.equal(r.factors.find((f) => f.key === "profession")?.points, 40);
  assert.equal(r.factors.find((f) => f.key === "location")?.points, 15);
});

test("computeJobMatch: score never exceeds 100 and factors sum to score", () => {
  const r = computeJobMatch(baseCand, baseJob, new Set(["p1"]));
  const sum = r.factors.reduce((s, f) => s + f.points, 0);
  assert.equal(r.score, Math.min(100, sum));
  assert.ok(r.score <= 100);
});

test("computeJobMatch: primary vs non-primary vs related profession tiers", () => {
  const related = new Set(["p1", "p2"]);
  const primary = computeJobMatch(baseCand, baseJob, related).factors.find((f) => f.key === "profession")!;
  const secondary = computeJobMatch({ ...baseCand, primaryProfessionId: "px", professionIds: ["p1"] }, baseJob, related).factors.find((f) => f.key === "profession")!;
  const relatedOnly = computeJobMatch({ ...baseCand, primaryProfessionId: "p2", professionIds: ["p2"] }, baseJob, related).factors.find((f) => f.key === "profession")!;
  assert.equal(primary.points, 40);
  assert.equal(secondary.points, 32);
  assert.equal(relatedOnly.points, 18);
});

test("computeJobMatch: salary over budget is penalised", () => {
  const within = computeJobMatch(baseCand, baseJob, new Set(["p1"])).factors.find((f) => f.key === "salary")!;
  const slightlyOver = computeJobMatch({ ...baseCand, expectedSalaryMax: 2200 }, baseJob, new Set(["p1"])).factors.find((f) => f.key === "salary")!;
  const wayOver = computeJobMatch({ ...baseCand, expectedSalaryMax: 4000 }, baseJob, new Set(["p1"])).factors.find((f) => f.key === "salary")!;
  assert.equal(within.points, 15);
  assert.equal(slightlyOver.points, 8);
  assert.equal(wayOver.points, 2);
});

test("computeJobMatch: field-work requirement not met scores zero on that factor", () => {
  const job: JobLite = { ...baseJob, requirements: "Rad na terenu, putovanja" };
  const notWilling = computeJobMatch({ ...baseCand, fieldWorkWilling: false }, job, new Set(["p1"])).factors.find((f) => f.key === "field")!;
  const willing = computeJobMatch({ ...baseCand, fieldWorkWilling: true }, job, new Set(["p1"])).factors.find((f) => f.key === "field")!;
  assert.equal(notWilling.points, 0);
  assert.equal(willing.points, 8);
});

test("computeJobMatch: relocation willingness earns partial location points", () => {
  const cand: CandidateLite = { ...baseCand, city: "Osijek", relocationPreference: "CROATIA" };
  const loc = computeJobMatch(cand, baseJob, new Set(["p1"])).factors.find((f) => f.key === "location")!;
  assert.equal(loc.points, 9);
});
