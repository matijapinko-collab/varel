import "server-only";
import { db } from "@/lib/db";
import { parseCsvObjects } from "@/lib/csv";
import { toNum } from "@/lib/deals";
import type { OfferAvailability } from "@/generated/prisma/client";

/**
 * Shared offer-import pipeline (Phase 2/3). Used by:
 *  - the manual CSV upload (/api/admin/import-offers)
 *  - the partner feed fetcher ("Fetch feed now" + daily cron)
 *
 * Expected columns (case-insensitive; * = required):
 *   tool_slug*, partner_slug*, affiliate_url*, merchant_name, product_url,
 *   current_price, old_price, currency, coupon_code, coupon_description,
 *   shipping_cost, availability, sponsored, active
 *
 * When importing a single partner's feed, partner_slug may be omitted — pass
 * `forcePartnerId` and every row is attributed to that partner.
 */

export const MAX_IMPORT_ROWS = 1000;

export type ImportReport = {
  rows: number;
  created: number;
  updated: number;
  errors: string[];
};

const AVAILABILITY_MAP: Record<string, OfferAvailability> = {
  in_stock: "IN_STOCK",
  instock: "IN_STOCK",
  out_of_stock: "OUT_OF_STOCK",
  outofstock: "OUT_OF_STOCK",
  limited: "LIMITED",
  preorder: "PREORDER",
  unknown: "UNKNOWN",
  "": "UNKNOWN",
};

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function bool(v: string | undefined, fallback: boolean): boolean {
  if (!v) return fallback;
  return ["1", "true", "yes", "y"].includes(v.toLowerCase());
}

export async function importOffersFromCsv(
  csvText: string,
  opts: { forcePartnerId?: string } = {}
): Promise<ImportReport | { error: string }> {
  const rows = parseCsvObjects(csvText);
  if (!rows.length) {
    return { error: "No data rows found. The first row must be a header row." };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: `Too many rows (${rows.length}). Maximum is ${MAX_IMPORT_ROWS} per import.` };
  }

  const [tools, partners] = await Promise.all([
    db.tool.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } }),
    db.affiliatePartner.findMany({ where: { deletedAt: null }, select: { id: true, slug: true } }),
  ]);
  const toolBySlug = new Map(tools.map((t) => [t.slug, t.id]));
  const partnerBySlug = new Map(partners.map((p) => [p.slug, p.id]));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 2;
    try {
      const toolId = toolBySlug.get(r.tool_slug ?? "");
      const partnerId = opts.forcePartnerId ?? partnerBySlug.get(r.partner_slug ?? "");
      const affiliateUrl = r.affiliate_url ?? "";

      if (!toolId) { errors.push(`Line ${line}: unknown tool_slug "${r.tool_slug}"`); continue; }
      if (!partnerId) { errors.push(`Line ${line}: unknown partner_slug "${r.partner_slug}"`); continue; }
      if (!/^https?:\/\/.+/i.test(affiliateUrl)) {
        errors.push(`Line ${line}: invalid affiliate_url`);
        continue;
      }
      const availability =
        AVAILABILITY_MAP[(r.availability ?? "").toLowerCase().replace(/\s|-/g, "_")];
      if (availability === undefined) {
        errors.push(`Line ${line}: invalid availability "${r.availability}"`);
        continue;
      }

      const data = {
        merchantName: r.merchant_name || null,
        productUrl: r.product_url || null,
        affiliateUrl,
        currentPrice: num(r.current_price),
        oldPrice: num(r.old_price),
        currency: (r.currency || "EUR").toUpperCase().slice(0, 3),
        couponCode: r.coupon_code || null,
        couponDescription: r.coupon_description || null,
        shippingCost: num(r.shipping_cost),
        availability,
        sponsored: bool(r.sponsored, false),
        isActive: bool(r.active, true),
        lastCheckedAt: new Date(),
      };

      const candidates = await db.productOffer.findMany({
        where: { toolId, partnerId },
        select: { id: true, affiliateUrl: true, currentPrice: true, availability: true },
      });
      const existing =
        candidates.find((c) => c.affiliateUrl === affiliateUrl) ??
        (candidates.length === 1 ? candidates[0] : undefined);

      if (existing) {
        await db.productOffer.update({ where: { id: existing.id }, data });
        const changed =
          String(toNum(existing.currentPrice)) !== String(data.currentPrice) ||
          existing.availability !== data.availability;
        if (changed) {
          await db.priceHistory.create({
            data: {
              offerId: existing.id,
              toolId,
              partnerId,
              price: data.currentPrice,
              oldPrice: data.oldPrice,
              currency: data.currency,
              availability,
            },
          });
        }
        updated++;
      } else {
        const offer = await db.productOffer.create({ data: { toolId, partnerId, ...data } });
        await db.priceHistory.create({
          data: {
            offerId: offer.id,
            toolId,
            partnerId,
            price: data.currentPrice,
            oldPrice: data.oldPrice,
            currency: data.currency,
            availability,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(`Line ${line}: ${(e as Error).message}`);
    }
  }

  return { rows: rows.length, created, updated, errors: errors.slice(0, 50) };
}

/**
 * Fetches a partner's official CSV datafeed and imports it. Approved data
 * sources only (feed URLs configured per partner in the admin).
 */
export async function fetchPartnerFeed(partnerId: string): Promise<ImportReport | { error: string }> {
  const partner = await db.affiliatePartner.findUnique({ where: { id: partnerId } });
  if (!partner?.feedUrl) return { error: "This partner has no feed URL configured." };
  if (!/^https:\/\/.+/i.test(partner.feedUrl)) return { error: "Feed URL must be https://." };

  let text: string;
  try {
    const res = await fetch(partner.feedUrl, {
      headers: { accept: "text/csv, text/plain, */*" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return { error: `Feed fetch failed: HTTP ${res.status}` };
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > 5 * 1024 * 1024) return { error: "Feed too large (max 5 MB)." };
    text = await res.text();
    if (text.length > 5 * 1024 * 1024) return { error: "Feed too large (max 5 MB)." };
  } catch (e) {
    return { error: `Feed fetch failed: ${(e as Error).message}` };
  }

  const report = await importOffersFromCsv(text, { forcePartnerId: partner.id });
  if (!("error" in report)) {
    await db.affiliatePartner.update({
      where: { id: partner.id },
      data: { lastFeedFetchAt: new Date() },
    });
  }
  return report;
}
