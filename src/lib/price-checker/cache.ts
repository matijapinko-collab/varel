import { db } from "@/lib/db";
import type { PriceCheckerResponse } from "./types";

/**
 * Simple DB-backed cache for Price Checker results. There is no Redis in this
 * deployment, so we use a small Postgres table. Every operation is wrapped so a
 * cache outage NEVER breaks the search tool — reads/writes fail silently.
 */

export function cacheKey(country: string, normalizedQuery: string): string {
  return `price-checker:${country}:${normalizedQuery}`;
}

export async function readCache(key: string): Promise<PriceCheckerResponse | null> {
  try {
    const row = await db.priceCheckerCache.findUnique({ where: { cacheKey: key } });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      // Expired — best-effort cleanup, ignore failures.
      db.priceCheckerCache.delete({ where: { cacheKey: key } }).catch(() => {});
      return null;
    }
    return row.payload as unknown as PriceCheckerResponse;
  } catch {
    return null;
  }
}

export async function writeCache(
  key: string,
  payload: PriceCheckerResponse,
  ttlMinutes: number
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await db.priceCheckerCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, payload: payload as object, expiresAt },
      update: { payload: payload as object, expiresAt },
    });
  } catch {
    // Cache is best-effort; ignore write failures.
  }
}
