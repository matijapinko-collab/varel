/**
 * Varel Price Checker — shared types.
 *
 * Phase 1 scope: Amazon.de (Germany) only, via the Amazon Product
 * Advertising API (PA-API v5). No scraping. All fields that the API does not
 * return are left undefined so the UI can hide them — never faked.
 */

export type Marketplace = "amazon.de";
export type CountryCode = "DE";

/** One normalized product result shown as a card. */
export type PriceCheckerResult = {
  id: string;
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  /** Original / list price when the API reports a strike-through basis. */
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  isPrime?: boolean;
  availability?: string;
  deliveryInfo?: string;
  merchantName?: string;
  /** Always present: the affiliate link the CTA opens. */
  affiliateUrl: string;
};

export type PriceCheckerResponse = {
  query: string;
  country: CountryCode;
  marketplace: Marketplace;
  results: PriceCheckerResult[];
  /** True when the response was served from cache. */
  cached?: boolean;
};

/** Discriminated outcome so routes/UI can pick the right user-facing state. */
export type PriceCheckerOutcome =
  | { ok: true; data: PriceCheckerResponse }
  | { ok: false; reason: "not_configured" | "no_results" | "invalid_query" | "error" };
