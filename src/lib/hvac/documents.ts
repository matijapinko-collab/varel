import "server-only";
import { randomBytes } from "crypto";

/**
 * Line-item + document money maths for quotations and invoices.
 * Every value is rounded to 2 decimals at the boundary so stored totals always
 * reconcile with what the customer sees on the printed document.
 */

export type LineInput = {
  quantity: number;
  unitPriceEur: number;
  discountPct?: number; // quotations only; invoices pass 0
  vatPct: number;
};

export type LineTotals = {
  net: number; // after discount, before VAT
  vat: number;
  total: number; // net + vat
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Net/VAT/total for a single line. Net = qty × price × (1 − discount%). */
export function lineTotals(input: LineInput): LineTotals {
  const qty = Number.isFinite(input.quantity) ? input.quantity : 0;
  const price = Number.isFinite(input.unitPriceEur) ? input.unitPriceEur : 0;
  const discount = Math.min(Math.max(input.discountPct ?? 0, 0), 100);
  const vatPct = Math.max(input.vatPct ?? 0, 0);
  const net = r2(qty * price * (1 - discount / 100));
  const vat = r2(net * (vatPct / 100));
  return { net, vat, total: r2(net + vat) };
}

/** Aggregates stored line rows into document subtotal / VAT / total. */
export function documentTotals(lines: { totalEur: number | string; vatPct?: number | string; quantity?: number | string; unitPriceEur?: number | string; discountPct?: number | string }[]) {
  let subtotal = 0;
  let vat = 0;
  for (const l of lines) {
    const t = lineTotals({
      quantity: Number(l.quantity ?? 1),
      unitPriceEur: Number(l.unitPriceEur ?? 0),
      discountPct: Number(l.discountPct ?? 0),
      vatPct: Number(l.vatPct ?? 0),
    });
    subtotal += t.net;
    vat += t.vat;
  }
  subtotal = r2(subtotal);
  vat = r2(vat);
  return { subtotalEur: subtotal, vatEur: vat, totalEur: r2(subtotal + vat) };
}

/** Unguessable token for public quote/invoice share links. */
export function publicDocToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Billing name — prefer company name, fall back to person. */
export function billingName(c: { type: string; firstName?: string | null; lastName?: string | null; companyName?: string | null }): string {
  if (c.type === "COMPANY") return c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || "—";
}

/** Full billing address block from a customer's billing fields. */
export function billingAddressLines(c: { billingAddress?: string | null; billingCity?: string | null; billingPostalCode?: string | null }): string[] {
  const cityLine = [c.billingPostalCode, c.billingCity].filter(Boolean).join(" ");
  return [c.billingAddress, cityLine].filter((s): s is string => Boolean(s && s.trim()));
}

export const DOC_ROUNDING = r2;
