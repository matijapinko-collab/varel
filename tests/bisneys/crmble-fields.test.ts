import { test } from "node:test";
import assert from "node:assert/strict";
import { guessCrmbleMapping } from "../../src/lib/bisneyscrm/crmble/fields.ts";

test("guessCrmbleMapping: maps standard Crmble headers", () => {
  const m = guessCrmbleMapping(["Name", "Surname", "Email", "Phone", "Company", "Job title", "Deal value"]);
  assert.equal(m[0], "firstName");
  assert.equal(m[1], "lastName");
  assert.equal(m[2], "email");
  assert.equal(m[3], "phone");
  assert.equal(m[4], "company");
  assert.equal(m[5], "jobTitle");
  assert.equal(m[6], "dealValue");
});

test("guessCrmbleMapping: Croatian headers", () => {
  const m = guessCrmbleMapping(["Ime i prezime", "Tvrtka", "Funkcija", "Vrijednost posla"]);
  assert.equal(m[0], "fullName");
  assert.equal(m[1], "company");
  assert.equal(m[2], "jobTitle");
  assert.equal(m[3], "dealValue");
});

test("guessCrmbleMapping: no duplicate target fields", () => {
  const m = guessCrmbleMapping(["email", "e-mail"]);
  const vals = Object.values(m);
  assert.equal(new Set(vals).size, vals.length);
});
