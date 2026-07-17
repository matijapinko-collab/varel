import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCompanyName, normalizeOib, isValidOib, companyNameMatchScore, classifyMatch } from "../../src/lib/bisneyscrm/companywall/normalize.ts";

test("normalizeCompanyName: strips legal form, case, diacritics, punctuation", () => {
  assert.equal(normalizeCompanyName("EXCEL COMPUTERS d.o.o."), "excel computers");
  assert.equal(normalizeCompanyName("Excel Computers DOO"), "excel computers");
  assert.equal(normalizeCompanyName("ČAKOVEC GRADNJA j.d.o.o."), "cakovec gradnja");
});

test("normalizeOib: exactly 11 digits or null", () => {
  assert.equal(normalizeOib("12345678901"), "12345678901");
  assert.equal(normalizeOib("HR 123 456 789 01"), "12345678901");
  assert.equal(normalizeOib("12345"), null);
  assert.equal(normalizeOib(null), null);
});

test("isValidOib: MOD 11,10 checksum", () => {
  assert.equal(isValidOib("69435151530"), true); // known-valid test OIB
  assert.equal(isValidOib("12345678901"), false);
  assert.equal(isValidOib("123"), false);
});

test("companyNameMatchScore: identical after normalization = 1", () => {
  assert.equal(companyNameMatchScore("EXCEL COMPUTERS d.o.o.", "Excel Computers DOO"), 1);
});

test("companyNameMatchScore: partial overlap between 0 and 1", () => {
  const s = companyNameMatchScore("Excel Computers Zagreb", "Excel Computers");
  assert.ok(s > 0 && s < 1, `got ${s}`);
});

test("companyNameMatchScore: unrelated names score low", () => {
  assert.ok(companyNameMatchScore("Excel Computers", "Kamir Gradnja") < 0.3);
});

test("classifyMatch: equal OIB is authoritative (no confirm)", () => {
  const r = classifyMatch({ oibA: "12345678901", oibB: "1 2345678901", nameA: "A", nameB: "B" });
  assert.equal(r.method, "oib");
  assert.equal(r.confidence, 1);
  assert.equal(r.needsConfirm, false);
});

test("classifyMatch: exact name without OIB is strong but needs confirm", () => {
  const r = classifyMatch({ nameA: "Excel Computers d.o.o.", nameB: "Excel Computers DOO" });
  assert.equal(r.method, "exact_name");
  assert.equal(r.needsConfirm, true);
});

test("classifyMatch: dissimilar names never auto-merge", () => {
  const r = classifyMatch({ nameA: "Excel Computers", nameB: "Potpuno Druga Firma" });
  assert.equal(r.method, "none");
  assert.equal(r.needsConfirm, true);
});
