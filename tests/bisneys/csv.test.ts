import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDelimited, guessMapping } from "../../src/lib/bisneyscrm/import/csv.ts";

test("parseDelimited: basic comma CSV with header", () => {
  const t = parseDelimited("ime,email\nIvan,ivan@x.com\nMarko,marko@x.com");
  assert.deepEqual(t.headers, ["ime", "email"]);
  assert.equal(t.rows.length, 2);
  assert.deepEqual(t.rows[0], ["Ivan", "ivan@x.com"]);
});

test("parseDelimited: auto-detects semicolon (Croatian Excel)", () => {
  const t = parseDelimited("ime;grad;plaća\nIvan;Zagreb;2000");
  assert.deepEqual(t.headers, ["ime", "grad", "plaća"]);
  assert.deepEqual(t.rows[0], ["Ivan", "Zagreb", "2000"]);
});

test("parseDelimited: auto-detects tab", () => {
  const t = parseDelimited("a\tb\tc\n1\t2\t3");
  assert.deepEqual(t.headers, ["a", "b", "c"]);
  assert.deepEqual(t.rows[0], ["1", "2", "3"]);
});

test("parseDelimited: quoted field with embedded comma and quotes", () => {
  const t = parseDelimited('naziv,opis\n"Monter, viši","kaže ""bok"""');
  assert.deepEqual(t.rows[0], ["Monter, viši", 'kaže "bok"']);
});

test("parseDelimited: quoted field with embedded newline", () => {
  const t = parseDelimited('a,b\n"prvi\ndrugi",x');
  assert.equal(t.rows.length, 1);
  assert.equal(t.rows[0][0], "prvi\ndrugi");
});

test("parseDelimited: strips BOM and handles CRLF", () => {
  const t = parseDelimited("﻿a,b\r\n1,2\r\n");
  assert.deepEqual(t.headers, ["a", "b"]);
  assert.deepEqual(t.rows[0], ["1", "2"]);
});

test("parseDelimited: skips fully blank lines", () => {
  const t = parseDelimited("a,b\n1,2\n\n3,4");
  assert.equal(t.rows.length, 2);
});

test("parseDelimited: empty input yields no headers", () => {
  assert.deepEqual(parseDelimited("").headers, []);
});

test("guessMapping: matches common Croatian + English headers", () => {
  const m = guessMapping(["Ime i prezime", "E-mail", "Mobitel", "Grad", "Zanimanje"]);
  assert.equal(m[0], "fullName");
  assert.equal(m[1], "email");
  assert.equal(m[2], "phone");
  assert.equal(m[3], "city");
  assert.equal(m[4], "profession");
});

test("guessMapping: does not assign the same field twice", () => {
  const m = guessMapping(["email", "email2"]);
  const values = Object.values(m);
  assert.equal(new Set(values).size, values.length);
});
