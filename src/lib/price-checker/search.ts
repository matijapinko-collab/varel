import { AMAZON_DE, getAmazonCredentials, getPriceCheckerSettings } from "./config";
import { AmazonApiError, searchItems } from "./amazon";
import { cacheKey, readCache, writeCache } from "./cache";
import type { CountryCode, PriceCheckerOutcome, PriceCheckerResponse } from "./types";

/** Only Amazon.de / Germany is supported in Phase 1. */
export function isSupportedCountry(country: string): country is CountryCode {
  return country === "DE";
}

export type QueryValidation = { ok: true; value: string } | { ok: false };

/**
 * Validates and normalizes a search query: required, trimmed, 2–120 chars,
 * control characters stripped. Returns a clean value or a failure.
 */
export function validateQuery(raw: unknown): QueryValidation {
  if (typeof raw !== "string") return { ok: false };
  // Strip control chars and collapse whitespace.
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2 || cleaned.length > 120) return { ok: false };
  return { ok: true, value: cleaned };
}

function normalizeForCache(query: string): string {
  return query.toLowerCase();
}

/**
 * Full Price Checker search flow: validate → check enabled/config → cache →
 * PA-API → map → cache. Returns a discriminated outcome; the technical error
 * (if any) is logged server-side only, never surfaced to the client.
 */
export async function runPriceCheckerSearch(
  rawQuery: unknown,
  rawCountry: unknown
): Promise<PriceCheckerOutcome> {
  const country = typeof rawCountry === "string" ? rawCountry.toUpperCase() : "DE";
  if (!isSupportedCountry(country)) return { ok: false, reason: "invalid_query" };

  const valid = validateQuery(rawQuery);
  if (!valid.ok) return { ok: false, reason: "invalid_query" };

  const settings = await getPriceCheckerSettings();
  const creds = getAmazonCredentials();
  if (!settings.enabled || !creds) return { ok: false, reason: "not_configured" };

  const key = cacheKey(country, normalizeForCache(valid.value));

  if (settings.cacheEnabled) {
    const cached = await readCache(key);
    if (cached) return { ok: true, data: { ...cached, cached: true } };
  }

  let results;
  try {
    results = await searchItems(creds, valid.value, settings.resultsPerSearch);
  } catch (e) {
    // Log the technical detail server-side; never leak it to the client.
    if (e instanceof AmazonApiError) {
      console.error("[price-checker] PA-API error:", e.code ?? "", e.message);
    } else {
      console.error("[price-checker] unexpected error:", (e as Error).message);
    }
    return { ok: false, reason: "error" };
  }

  // Apply admin field-visibility toggles (never fabricate missing fields).
  const filtered = results.slice(0, settings.resultsPerSearch).map((r) => ({
    ...r,
    isPrime: settings.showPrime ? r.isPrime : undefined,
    rating: settings.showRating ? r.rating : undefined,
    reviewCount: settings.showReviews ? r.reviewCount : undefined,
    availability: settings.showAvailability ? r.availability : undefined,
  }));

  if (filtered.length === 0) return { ok: false, reason: "no_results" };

  const data: PriceCheckerResponse = {
    query: valid.value,
    country,
    marketplace: AMAZON_DE.marketplace,
    results: filtered,
  };

  if (settings.cacheEnabled) {
    await writeCache(key, data, settings.cacheMinutes);
  }

  return { ok: true, data };
}
