import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Product-offer redirect: /o/<offerId>
 * Records an affiliate-click analytics event, appends the partner's default
 * tracking params, then 302-redirects to the offer's affiliate URL.
 * Offer affiliate URLs are managed only in the admin — never hardcoded.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/o/[id]">) {
  const { id } = await ctx.params;

  const offer = await db.productOffer.findUnique({
    where: { id },
    include: { partner: true },
  });
  if (!offer || !offer.isActive) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const h = request.headers;
  const ua = h.get("user-agent") ?? "";
  const device = /mobile/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
  try {
    await db.analyticsEvent.create({
      data: {
        type: "AFFILIATE_CLICK",
        entityType: "OFFER",
        entityId: offer.id,
        referrer: h.get("referer")?.slice(0, 255),
        device,
        country: h.get("x-vercel-ip-country"),
        metadataJson: { partnerId: offer.partnerId, toolId: offer.toolId },
      },
    });
  } catch (e) {
    console.error("offer click tracking failed", e);
  }

  // Append the partner's default tracking params if configured.
  let target = offer.affiliateUrl;
  const params = offer.partner?.defaultTrackingParams?.trim();
  if (params) {
    target += (target.includes("?") ? "&" : "?") + params.replace(/^[?&]/, "");
  }

  return NextResponse.redirect(target, 302);
}
