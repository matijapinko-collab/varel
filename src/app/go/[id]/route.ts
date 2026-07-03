import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/security";

/**
 * Central affiliate redirect: /go/<affiliateLinkId>
 * Records the click, then 302-redirects to the affiliate URL.
 * Affiliate URLs are managed ONLY in the Affiliate Manager — content
 * references links via this route, never hardcoded URLs.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/go/[id]">
) {
  const { id } = await ctx.params;

  const link = await db.affiliateLink.findFirst({
    where: { id, deletedAt: null },
  });
  if (!link || link.status !== "ACTIVE") {
    // Fall back to the original URL if the link is paused; otherwise home.
    const fallback = link?.originalUrl ?? "/";
    return NextResponse.redirect(new URL(fallback, request.url), 302);
  }

  const h = request.headers;
  const ua = h.get("user-agent") ?? "";
  const device = /mobile/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
  const referrer = h.get("referer");
  const url = new URL(request.url);

  // Fire-and-forget click tracking; a tracking failure must never break the redirect.
  try {
    await Promise.all([
      db.affiliateClick.create({
        data: {
          affiliateLinkId: link.id,
          sourceEntityType: url.searchParams.get("src") ?? undefined,
          sourceEntityId: url.searchParams.get("sid") ?? undefined,
          languageCode: url.searchParams.get("lang") ?? undefined,
          country: h.get("x-vercel-ip-country"),
          device,
          referrer: referrer?.slice(0, 255),
          userAgent: ua.slice(0, 255),
          ipHash: hashIp(
            h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim()
          ),
        },
      }),
      db.analyticsEvent.create({
        data: {
          type: "AFFILIATE_CLICK",
          entityType: "AFFILIATE_LINK",
          entityId: link.id,
          referrer: referrer?.slice(0, 255),
          device,
          country: h.get("x-vercel-ip-country"),
        },
      }),
    ]);
  } catch (e) {
    console.error("affiliate click tracking failed", e);
  }

  return NextResponse.redirect(link.affiliateUrl, 302);
}
