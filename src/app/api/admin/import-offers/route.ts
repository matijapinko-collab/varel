import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { parseCsvObjects } from "@/lib/csv";
import type { OfferAvailability, Prisma } from "@/generated/prisma/client";

/**
 * CSV/feed import for product offers (Best Deals — Phase 2).
 *
 * Expected header columns (case-insensitive; * = required):
 *   tool_slug*, partner_slug*, affiliate_url*, merchant_name, product_url,
 *   current_price, old_price, currency, coupon_code, coupon_description,
 *   shipping_cost, availability, sponsored, active
 *
 * Matching: an existing offer is updated when the same tool + partner +
 * affiliate_url is found; otherwise (tool + partner and only one offer exists)
 * that offer is updated; otherwise a new offer is created. Every price or
 * availability change records a PriceHistory row and bumps lastCheckedAt.
 */

const MAX_ROWS = 1000;
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !roleCan(session.user.role, "affiliate.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "CSV too large (max 2 MB)." }, { status: 413 });
  }

  const text = await file.text();
  const rows = parseCsvObjects(text);
  if (!rows.length) {
    return NextResponse.json(
      { error: "No data rows found. The first row must be a header row." },
      { status: 400 }
    );
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). Maximum is ${MAX_ROWS} per import.` },
      { status: 400 }
    );
  }

  // Preload lookup tables once.
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
    const line = i + 2; // human-friendly (after header)
    try {
      const toolId = toolBySlug.get(r.tool_slug ?? "");
      const partnerId = partnerBySlug.get(r.partner_slug ?? "");
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

      // Match: same tool+partner+affiliateUrl → update; else single offer for
      // tool+partner → update it; else create.
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
          String(existing.currentPrice) !== String(data.currentPrice) ||
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

  await audit({
    userId: session.user.id,
    action: "AFFILIATE_UPDATE",
    entityType: "OFFER_IMPORT",
    details: {
      filename: file.name,
      rows: rows.length,
      created,
      updated,
      errorCount: errors.length,
    } as Prisma.InputJsonValue,
  });

  return NextResponse.json({
    rows: rows.length,
    created,
    updated,
    errors: errors.slice(0, 50),
  });
}
