import type { OfferAvailability } from "@/generated/prisma/client";

/**
 * Best Deals helpers: effective price, discount, best-offer selection and a
 * simple "Deal Score". Kept intentionally simple for V1 (Phase 1) — the model
 * can be refined later without changing callers.
 */

export type OfferInput = {
  id: string;
  currentPrice: unknown;
  oldPrice: unknown;
  shippingCost: unknown;
  currency: string;
  couponCode: string | null;
  availability: OfferAvailability;
  isActive: boolean;
  lastCheckedAt: Date | null;
  partner?: { priority: number } | null;
};

/** Prisma Decimal | number | string → number | null. */
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

export function isAvailable(o: { availability: OfferAvailability; isActive: boolean }): boolean {
  return o.isActive && o.availability !== "OUT_OF_STOCK";
}

/**
 * Effective price = product price + shipping (coupon amount is unknown from a
 * code, so it is surfaced as a badge rather than subtracted). Returns null if
 * there is no price.
 */
export function effectivePrice(o: OfferInput): number | null {
  const price = toNum(o.currentPrice);
  if (price == null) return null;
  const shipping = toNum(o.shippingCost) ?? 0;
  return price + shipping;
}

export function discountPercent(o: { currentPrice: unknown; oldPrice: unknown }): number | null {
  const cur = toNum(o.currentPrice);
  const old = toNum(o.oldPrice);
  if (cur == null || old == null || old <= 0 || cur >= old) return null;
  return Math.round(((old - cur) / old) * 100);
}

/**
 * Best offer: available offers first, then lowest effective price, then higher
 * partner priority, then most recently checked.
 */
export function selectBestOffer<T extends OfferInput>(offers: T[]): T | null {
  const active = offers.filter((o) => o.isActive);
  if (!active.length) return null;
  return [...active].sort((a, b) => {
    const availDiff = Number(isAvailable(b)) - Number(isAvailable(a));
    if (availDiff !== 0) return availDiff;
    const ea = effectivePrice(a);
    const eb = effectivePrice(b);
    if (ea != null && eb != null && ea !== eb) return ea - eb;
    if (ea == null && eb != null) return 1;
    if (eb == null && ea != null) return -1;
    const prio = (b.partner?.priority ?? 0) - (a.partner?.priority ?? 0);
    if (prio !== 0) return prio;
    return (b.lastCheckedAt?.getTime() ?? 0) - (a.lastCheckedAt?.getTime() ?? 0);
  })[0];
}

export type DealScoreKey =
  | "EXCELLENT"
  | "GOOD"
  | "NORMAL"
  | "PRICE_INCREASED"
  | "OUT_OF_STOCK";

const SCORE_META: Record<DealScoreKey, { label: string; tone: string }> = {
  EXCELLENT: { label: "Excellent deal", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  GOOD: { label: "Good deal", tone: "bg-primary/10 text-primary" },
  NORMAL: { label: "Normal price", tone: "bg-soft text-muted" },
  PRICE_INCREASED: { label: "Price increased", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  OUT_OF_STOCK: { label: "Out of stock", tone: "bg-red-500/10 text-red-500" },
};

/** Simple Deal Score from discount, availability and price direction. */
export function dealScore(o: OfferInput): { key: DealScoreKey; label: string; tone: string } {
  let key: DealScoreKey;
  if (!isAvailable(o)) {
    key = "OUT_OF_STOCK";
  } else {
    const cur = toNum(o.currentPrice);
    const old = toNum(o.oldPrice);
    if (cur != null && old != null && cur > old) key = "PRICE_INCREASED";
    else {
      const d = discountPercent(o) ?? 0;
      key = d >= 25 ? "EXCELLENT" : d >= 10 ? "GOOD" : "NORMAL";
    }
  }
  return { key, ...SCORE_META[key] };
}

export function formatPrice(value: unknown, currency = "EUR"): string | null {
  const n = toNum(value);
  if (n == null) return null;
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
  return `${symbol}${n.toFixed(2)}`;
}

/** Standard affiliate disclosure copy (EN default, HR translation). */
export function affiliateDisclosure(locale: string): string {
  if (locale === "hr") {
    return "Neke poveznice na ovoj stranici su affiliate poveznice. To znači da možemo zaraditi proviziju ako kliknete i obavite kupnju, bez dodatnog troška za vas. Prikazujemo samo ponude odabranih partnera i nastojimo držati cijene točnima, no cijene i dostupnost mogu se promijeniti.";
  }
  return "Some links on this page are affiliate links. This means we may earn a commission if you click a link and make a purchase, at no additional cost to you. We only show offers from selected partners and try to keep prices accurate, but prices and availability can change.";
}
