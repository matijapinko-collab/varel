import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { fetchPartnerFeed } from "@/server/import-offers";
import { publishDueScheduledPosts } from "@/server/actions/posts";

export const maxDuration = 120;

/**
 * Daily deals maintenance (Vercel Cron → vercel.json).
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token automatically).
 *
 * 1. Fetches every active partner's official CSV datafeed (if configured).
 * 2. Deactivates offers whose validUntil has passed.
 * 3. Archives published deals whose end date has passed.
 * 4. Records a daily price-history snapshot for active offers (keeps the
 *    price chart continuous even when prices don't change).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary: Record<string, unknown> = {};

  // 1. Partner feeds
  const feedPartners = await db.affiliatePartner.findMany({
    where: { isActive: true, deletedAt: null, feedUrl: { not: null } },
    select: { id: true, slug: true },
  });
  const feeds: Record<string, unknown> = {};
  for (const partner of feedPartners) {
    const report = await fetchPartnerFeed(partner.id);
    feeds[partner.slug] =
      "error" in report
        ? { error: report.error }
        : { rows: report.rows, created: report.created, updated: report.updated, errors: report.errors.length };
  }
  summary.feeds = feeds;

  // 2. Deactivate offers past validUntil
  const deactivated = await db.productOffer.updateMany({
    where: { isActive: true, validUntil: { lt: now } },
    data: { isActive: false },
  });
  summary.offersDeactivated = deactivated.count;

  // 3. Archive expired deals
  const archived = await db.deal.updateMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ endsAt: { lt: now } }, { AND: [{ endsAt: null }, { validUntil: { lt: now } }] }],
    },
    data: { status: "ARCHIVED" },
  });
  summary.dealsArchived = archived.count;

  // 4. Daily snapshot: one history point per active offer per ~day
  const snapshotCutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const activeOffers = await db.productOffer.findMany({
    where: { isActive: true, currentPrice: { not: null } },
    select: {
      id: true, toolId: true, partnerId: true, currentPrice: true, oldPrice: true,
      currency: true, availability: true,
      priceHistory: { orderBy: { checkedAt: "desc" }, take: 1, select: { checkedAt: true } },
    },
  });
  let snapshots = 0;
  for (const offer of activeOffers) {
    const last = offer.priceHistory[0]?.checkedAt;
    if (!last || last < snapshotCutoff) {
      await db.priceHistory.create({
        data: {
          offerId: offer.id,
          toolId: offer.toolId,
          partnerId: offer.partnerId,
          price: offer.currentPrice,
          oldPrice: offer.oldPrice,
          currency: offer.currency,
          availability: offer.availability,
        },
      });
      snapshots++;
    }
  }
  summary.priceSnapshots = snapshots;

  // 5. Publish posts whose scheduled time has passed.
  summary.scheduledPostsPublished = await publishDueScheduledPosts();

  await audit({
    action: "UPDATE",
    entityType: "DEALS_CRON",
    details: summary as never,
  });

  return NextResponse.json({ ok: true, ...summary });
}
