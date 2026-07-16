import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trialDaysRemaining,
  effectiveSubscriptionStatus,
  isOperational,
} from "../../src/lib/electro/subscription.ts";
import { validateElectroPassword } from "../../src/lib/electro/auth/password.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-07-16T12:00:00Z");

test("trialDaysRemaining: counts whole days up, never negative", () => {
  assert.equal(trialDaysRemaining(new Date(now.getTime() + 10 * DAY), now), 10);
  assert.equal(trialDaysRemaining(new Date(now.getTime() + 0.5 * DAY), now), 1);
  assert.equal(trialDaysRemaining(new Date(now.getTime() - DAY), now), 0);
  assert.equal(trialDaysRemaining(null, now), 0);
});

test("effectiveSubscriptionStatus: expired trial reads as EXPIRED", () => {
  assert.equal(
    effectiveSubscriptionStatus({ status: "TRIAL", trialEndsAt: new Date(now.getTime() - 1) }, now),
    "EXPIRED"
  );
  assert.equal(
    effectiveSubscriptionStatus({ status: "TRIAL", trialEndsAt: new Date(now.getTime() + DAY) }, now),
    "TRIAL"
  );
  // Non-trial statuses pass through untouched.
  assert.equal(
    effectiveSubscriptionStatus({ status: "SUSPENDED", trialEndsAt: new Date(now.getTime() - DAY) }, now),
    "SUSPENDED"
  );
  assert.equal(effectiveSubscriptionStatus({ status: "ACTIVE", trialEndsAt: null }, now), "ACTIVE");
});

test("isOperational: only TRIAL and ACTIVE allow app use", () => {
  assert.equal(isOperational("TRIAL"), true);
  assert.equal(isOperational("ACTIVE"), true);
  for (const s of ["PENDING_APPROVAL", "PAST_DUE", "SUSPENDED", "CANCELLED", "EXPIRED"] as const) {
    assert.equal(isOperational(s), false);
  }
});

test("validateElectroPassword: enforces the full policy", () => {
  assert.equal(validateElectroPassword("Kratka1!"), "Lozinka mora imati najmanje 10 znakova.");
  assert.ok(validateElectroPassword("svemalaslova1!"));
  assert.ok(validateElectroPassword("SVEVELIKASLOVA1!"));
  assert.ok(validateElectroPassword("BezZnamenke!!"));
  assert.ok(validateElectroPassword("BezPosebnog12"));
  assert.ok(validateElectroPassword("Ispravna12!", { reused: true }));
  assert.equal(validateElectroPassword("Ispravna12!"), null);
});
