import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  transitionRequiresReason,
  clampPercent,
} from "../../src/lib/electro/projects.ts";

test("canTransition: allows sensible moves, blocks nonsense", () => {
  assert.equal(canTransition("DRAFT", "OFFER"), true);
  assert.equal(canTransition("ACTIVE", "ON_HOLD"), true);
  assert.equal(canTransition("TECHNICAL_REVIEW", "COMPLETED"), true);
  // ARCHIVED is terminal.
  assert.equal(canTransition("ARCHIVED", "ACTIVE"), false);
  // Can't jump straight from DRAFT to COMPLETED.
  assert.equal(canTransition("DRAFT", "COMPLETED"), false);
  // Same status is a no-op, allowed.
  assert.equal(canTransition("ACTIVE", "ACTIVE"), true);
});

test("transitionRequiresReason: flags the reason-required transitions (brief §17)", () => {
  assert.equal(transitionRequiresReason("ACTIVE", "ON_HOLD"), true);
  assert.equal(transitionRequiresReason("ACTIVE", "CANCELLED"), true);
  assert.equal(transitionRequiresReason("ACTIVE", "WAITING_FOR_INVESTOR"), true);
  assert.equal(transitionRequiresReason("DRAFT", "OFFER"), false);
  assert.equal(transitionRequiresReason("APPROVED", "ACTIVE"), false);
});

test("clampPercent: clamps to 0–100 and rounds", () => {
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(150), 100);
  assert.equal(clampPercent(42.6), 43);
  assert.equal(clampPercent(NaN), 0);
});
