import { test } from "node:test";
import assert from "node:assert/strict";
import { lineTotals, documentTotals, billingName, billingAddressLines } from "../../src/lib/hvac/documents.ts";

test("lineTotals: quantity × price with per-line VAT", () => {
  const t = lineTotals({ quantity: 2, unitPriceEur: 150, vatPct: 25 });
  assert.equal(t.net, 300);
  assert.equal(t.vat, 75);
  assert.equal(t.total, 375);
});

test("lineTotals: applies discount before VAT", () => {
  const t = lineTotals({ quantity: 2, unitPriceEur: 150, discountPct: 10, vatPct: 25 });
  assert.equal(t.net, 270); // 300 − 10%
  assert.equal(t.vat, 67.5);
  assert.equal(t.total, 337.5);
});

test("lineTotals: zero VAT for a non-VAT company", () => {
  const t = lineTotals({ quantity: 3, unitPriceEur: 40, vatPct: 0 });
  assert.equal(t.net, 120);
  assert.equal(t.vat, 0);
  assert.equal(t.total, 120);
});

test("lineTotals: rounds to 2 decimals at the boundary", () => {
  const t = lineTotals({ quantity: 3, unitPriceEur: 33.333, vatPct: 25 });
  assert.equal(t.net, 100); // 99.999 → 100.00
  assert.equal(t.vat, 25);
  assert.equal(t.total, 125);
});

test("lineTotals: clamps discount to [0,100]", () => {
  assert.equal(lineTotals({ quantity: 1, unitPriceEur: 100, discountPct: 150, vatPct: 0 }).net, 0);
  assert.equal(lineTotals({ quantity: 1, unitPriceEur: 100, discountPct: -20, vatPct: 0 }).net, 100);
});

test("documentTotals: sums lines into subtotal/VAT/total", () => {
  const totals = documentTotals([
    { totalEur: 337.5, quantity: 2, unitPriceEur: 150, discountPct: 10, vatPct: 25 },
    { totalEur: 120, quantity: 3, unitPriceEur: 40, vatPct: 0 },
  ]);
  assert.equal(totals.subtotalEur, 390); // 270 + 120
  assert.equal(totals.vatEur, 67.5);
  assert.equal(totals.totalEur, 457.5);
});

test("billingName: prefers company for COMPANY, person otherwise", () => {
  assert.equal(billingName({ type: "COMPANY", companyName: "Klima d.o.o.", firstName: "A", lastName: "B" }), "Klima d.o.o.");
  assert.equal(billingName({ type: "INDIVIDUAL", firstName: "Ivan", lastName: "Horvat" }), "Ivan Horvat");
  assert.equal(billingName({ type: "INDIVIDUAL" }), "—");
});

test("billingAddressLines: drops empty parts", () => {
  assert.deepEqual(billingAddressLines({ billingAddress: "Ilica 1", billingCity: "Zagreb", billingPostalCode: "10000" }), ["Ilica 1", "10000 Zagreb"]);
  assert.deepEqual(billingAddressLines({ billingAddress: null, billingCity: null, billingPostalCode: null }), []);
});
