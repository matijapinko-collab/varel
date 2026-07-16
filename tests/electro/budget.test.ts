import { test } from "node:test";
import assert from "node:assert/strict";
import {
  plannedBudgetTotal,
  budgetUtilisation,
  estimatedMargin,
  variance,
} from "../../src/lib/electro/budget.ts";

test("plannedBudgetTotal: sums all budget lines incl. reserve (brief §47)", () => {
  assert.equal(
    plannedBudgetTotal({ materialBudget: 100, laborBudget: 50, subcontractorBudget: 30, otherBudget: 10, reserve: 20 }),
    210
  );
  assert.equal(plannedBudgetTotal({ materialBudget: null, laborBudget: 40 }), 40);
});

test("budgetUtilisation: fraction, Infinity on zero-planned-with-spend", () => {
  assert.equal(budgetUtilisation(200, 100), 0.5);
  assert.equal(budgetUtilisation(100, 150), 1.5);
  assert.equal(budgetUtilisation(0, 0), 0);
  assert.equal(budgetUtilisation(0, 5), Infinity);
});

test("estimatedMargin & variance (brief §45, §48)", () => {
  assert.equal(estimatedMargin(1000, 700), 300);
  assert.equal(estimatedMargin(null, 700), -700);
  assert.equal(variance(500, 600), 100);
  assert.equal(variance(500, 400), -100);
});
