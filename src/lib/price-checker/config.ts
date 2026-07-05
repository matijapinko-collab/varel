import { getSetting } from "@/lib/settings";
import type { CountryCode, Marketplace } from "./types";

/**
 * Price Checker configuration.
 *
 * SECRETS (Amazon PA-API keys) come from environment variables ONLY — they are
 * never stored in the database and never sent to the browser. The admin UI only
 * displays status (configured / not) and non-secret settings.
 *
 * NON-SECRET SETTINGS (enable flag, result count, field toggles, cache, copy)
 * live in the `settings` table under `price_checker` and are admin-editable.
 */

export const AMAZON_DE = {
  marketplace: "amazon.de" as Marketplace,
  country: "DE" as CountryCode,
  // PA-API host + region for the German marketplace.
  host: "webservices.amazon.de",
  region: "eu-west-1",
  marketplaceUrl: "www.amazon.de",
  currency: "EUR",
} as const;

export type AmazonCredentials = {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  host: string;
  region: string;
  marketplaceUrl: string;
};

/** Reads Amazon PA-API secrets from env. Returns null when not fully set. */
export function getAmazonCredentials(): AmazonCredentials | null {
  const accessKey = process.env.AMAZON_ACCESS_KEY?.trim();
  const secretKey = process.env.AMAZON_SECRET_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();
  if (!accessKey || !secretKey || !partnerTag) return null;
  return {
    accessKey,
    secretKey,
    partnerTag,
    host: process.env.AMAZON_HOST?.trim() || AMAZON_DE.host,
    region: process.env.AMAZON_REGION?.trim() || AMAZON_DE.region,
    marketplaceUrl: process.env.AMAZON_MARKETPLACE?.trim() || AMAZON_DE.marketplaceUrl,
  };
}

export function isAmazonConfigured(): boolean {
  return getAmazonCredentials() !== null;
}

/** Non-secret, admin-editable Price Checker settings. */
export type PriceCheckerSettings = {
  enabled: boolean;
  resultsPerSearch: number; // 10 or 15
  showPrime: boolean;
  showRating: boolean;
  showReviews: boolean;
  showAvailability: boolean;
  cacheEnabled: boolean;
  cacheMinutes: number;
  affiliateDisclosure: string;
  pageTitle: string;
  pageSubtitle: string;
  searchPlaceholder: string;
  noResultsMessage: string;
  errorMessage: string;
  unavailableMessage: string;
};

export const DEFAULT_PRICE_CHECKER_SETTINGS: PriceCheckerSettings = {
  enabled: true,
  resultsPerSearch: 10,
  showPrime: true,
  showRating: true,
  showReviews: true,
  showAvailability: true,
  cacheEnabled: true,
  cacheMinutes: 30,
  affiliateDisclosure:
    "Varel may earn a commission when you buy through links on this page. This does not affect the price you pay.",
  pageTitle: "Varel Price Checker",
  pageSubtitle: "Find better prices on Amazon.de.",
  searchPlaceholder: "Search for a product, brand or model...",
  noResultsMessage:
    "No products found for this search. Try a different product name, brand or model.",
  errorMessage: "Something went wrong while searching. Please try again in a moment.",
  unavailableMessage: "Price search is currently unavailable. Please try again later.",
};

const SETTINGS_KEY = "price_checker";

export async function getPriceCheckerSettings(): Promise<PriceCheckerSettings> {
  const stored = await getSetting<Partial<PriceCheckerSettings>>(SETTINGS_KEY).catch(() => null);
  const merged = { ...DEFAULT_PRICE_CHECKER_SETTINGS, ...(stored ?? {}) };
  // Clamp results to the allowed 10–15 range.
  merged.resultsPerSearch = Math.min(15, Math.max(10, merged.resultsPerSearch || 10));
  merged.cacheMinutes = Math.min(1440, Math.max(1, merged.cacheMinutes || 30));
  return merged;
}

export const PRICE_CHECKER_SETTINGS_KEY = SETTINGS_KEY;
