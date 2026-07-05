import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import { runPriceCheckerSearch } from "@/lib/price-checker/search";
import { AMAZON_DE } from "@/lib/price-checker/config";
import type { PriceCheckerOutcome } from "@/lib/price-checker/types";

/**
 * Varel Price Checker search API.
 *
 * GET  /api/price-checker/search?query=...&country=DE
 * POST /api/price-checker/search   { query, country }
 *
 * Server-side only: Amazon secrets never reach the browser. Technical errors
 * are logged server-side; the client receives generic, user-safe messages.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function messageFor(reason: Exclude<PriceCheckerOutcome & { ok: false }, { ok: true }>["reason"]): {
  status: number;
  body: { error: string; code: string };
} {
  switch (reason) {
    case "invalid_query":
      return { status: 400, body: { error: "invalid_query", code: "invalid_query" } };
    case "not_configured":
      return { status: 503, body: { error: "not_configured", code: "not_configured" } };
    case "no_results":
      return { status: 200, body: { error: "no_results", code: "no_results" } };
    case "error":
    default:
      return { status: 502, body: { error: "error", code: "error" } };
  }
}

async function handle(query: unknown, country: unknown) {
  const outcome = await runPriceCheckerSearch(query, country ?? AMAZON_DE.country);

  if (outcome.ok) {
    // Record a search analytics event server-side (best-effort).
    void recordSearch(outcome.data.query, outcome.data.country, outcome.data.results.length);
    return NextResponse.json(outcome.data);
  }

  if (outcome.reason === "no_results") {
    void recordSearch(String(query ?? ""), "DE", 0);
    return NextResponse.json(
      { query: typeof query === "string" ? query : "", country: "DE", marketplace: AMAZON_DE.marketplace, results: [] }
    );
  }

  const { status, body } = messageFor(outcome.reason);
  return NextResponse.json(body, { status });
}

async function recordSearch(query: string, country: string, resultCount: number) {
  try {
    const meta = await requestMeta();
    const ua = meta.userAgent ?? "";
    const device = /mobile/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
    await db.analyticsEvent.create({
      data: {
        type: "SEARCH",
        entityType: "PRICE_CHECKER",
        path: "/best-deals",
        country: meta.country,
        device,
        referrer: meta.referrer,
        metadataJson: {
          query,
          country,
          marketplace: AMAZON_DE.marketplace,
          resultCount,
        },
      },
    });
  } catch {
    // Analytics is best-effort — never block the search.
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handle(url.searchParams.get("query"), url.searchParams.get("country"));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_query", code: "invalid_query" }, { status: 400 });
  }
  const { query, country } = (body ?? {}) as { query?: unknown; country?: unknown };
  return handle(query, country);
}
