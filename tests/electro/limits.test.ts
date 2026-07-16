import { test } from "node:test";
import assert from "node:assert/strict";
import { limitReachedMessage, LAST_ADMIN_MESSAGE } from "../../src/lib/electro/limit-messages.ts";

test("limitReachedMessage: names the entity and the limit (brief §72)", () => {
  const msg = limitReachedMessage("maxActiveProjects", 5);
  assert.match(msg, /5/);
  assert.match(msg, /aktivnih projekata/);
  assert.match(msg, /viši paket/);
});

test("limitReachedMessage: falls back to the raw key for unknown limits", () => {
  assert.match(limitReachedMessage("maxWidgets", 3), /maxWidgets/);
});

test("LAST_ADMIN_MESSAGE: instructs assigning admin to someone else first (brief §9)", () => {
  assert.match(LAST_ADMIN_MESSAGE, /najmanje jednog aktivnog administratora/);
});
