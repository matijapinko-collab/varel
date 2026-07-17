import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCandidateFromCard } from "../../src/lib/bisneyscrm/import/trello-parse.ts";

test("parseCandidateFromCard: extracts name, email and phone from title", () => {
  const p = parseCandidateFromCard({ name: "Ivan Horvat — 091 234 5678 — ivan.horvat@example.com" });
  assert.equal(p.fullName, "Ivan Horvat");
  assert.equal(p.email, "ivan.horvat@example.com");
  assert.ok(p.phone && p.phone.includes("091"));
});

test("parseCandidateFromCard: pulls email/phone from description too", () => {
  const p = parseCandidateFromCard({ name: "Marko Marić", desc: "Kontakt: marko@example.com, tel 0915551234" });
  assert.equal(p.email, "marko@example.com");
  assert.ok(p.phone && p.phone.includes("0915551234"));
});

test("parseCandidateFromCard: name trimmed to at most 4 tokens, no contact noise", () => {
  const p = parseCandidateFromCard({ name: "Ana Marija Kovač Novak dodatni tekst 099/111-222" });
  assert.ok(p.fullName.split(" ").length <= 4);
  assert.ok(!/\d/.test(p.fullName));
});

test("parseCandidateFromCard: labels become tags, deduped", () => {
  const p = parseCandidateFromCard({ name: "Test", labels: ["HVAC", "Senior", "HVAC"] });
  assert.deepEqual([...p.tags].sort(), ["HVAC", "Senior"]);
});

test("parseCandidateFromCard: label map maps to profession/status/tag", () => {
  const p = parseCandidateFromCard(
    { name: "Test", labels: ["hvac-serviser"] },
    { "hvac-serviser": { professionId: "prof_1", professionName: "HVAC serviser", status: "QUALIFIED", tag: "HVAC" } },
  );
  assert.equal(p.professionId, "prof_1");
  assert.equal(p.professionHint, "HVAC serviser");
  assert.equal(p.status, "QUALIFIED");
  assert.deepEqual(p.tags, ["HVAC"]);
});

test("parseCandidateFromCard: missing contacts yield nulls, name falls back to title", () => {
  const p = parseCandidateFromCard({ name: "Samo Ime" });
  assert.equal(p.fullName, "Samo Ime");
  assert.equal(p.email, null);
  assert.equal(p.phone, null);
});
