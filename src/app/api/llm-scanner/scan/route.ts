import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runFreeScan, domainOf, normalizeUrl, localizeIssues, type PageFacts } from "@/lib/llm-scanner/scan";
import { renderPageWithPlaywright } from "@/lib/llm-scanner/renderer";
import { analyzeRenderDelta } from "@/lib/llm-scanner/render-analysis";
import { getLlmScannerSettings } from "@/lib/llm-scanner/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  url: z.string().min(3).max(300),
  email: z.string().email().max(254),
  language: z.enum(["en", "hr"]).default("en"),
  consent: z.literal(true),
  permission: z.literal(true),
});

function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { url, email, language } = parsed.data;
  const ip = clientIp(request);

  // Basic rate limiting: max 8 scans per 10 minutes per email or IP.
  try {
    const since = new Date(Date.now() - 10 * 60_000);
    const recent = await db.llmScanRequest.count({
      where: { createdAt: { gte: since }, OR: [{ email: email.toLowerCase() }, ...(ip ? [{ permissionIp: ip }] : [])] },
    });
    if (recent >= 8) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    /* if the count fails, continue — don't block the scan */
  }

  const normalized = normalizeUrl(url);
  if (!normalized) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const result = await runFreeScan(normalized);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.reason === "blocked_host" ? 400 : 422 });
  }

  // Simplified rendered-DOM signal (graceful no-op when no browser is available).
  let render: {
    available: boolean;
    status: string;
    jsDependencyLevel: string;
    staticWordCount: number;
    renderedWordCount: number;
    contentGainPercent: number;
    summary: string;
  } | null = null;
  try {
    const settings = await getLlmScannerSettings();
    if (settings.playwrightEnabled && settings.freeScanRenderEnabled) {
      const rendered = await renderPageWithPlaywright(result.url, { timeoutMs: settings.renderTimeoutFreeMs, mode: "fast", screenshot: false });
      if (!(rendered.renderStatus === "skipped" && rendered.renderError === "no_browser_available")) {
        const delta = analyzeRenderDelta(result.facts as PageFacts, rendered, language);
        render = {
          available: rendered.renderStatus === "success",
          status: rendered.renderStatus,
          jsDependencyLevel: delta.jsDependencyLevel,
          staticWordCount: delta.staticWordCount,
          renderedWordCount: delta.renderedWordCount,
          contentGainPercent: delta.renderedContentGainPercent,
          summary: delta.summary,
        };
      }
    }
  } catch {
    /* render is a bonus signal — never block the free scan */
  }

  let requestId: string | null = null;
  try {
    const created = await db.llmScanRequest.create({
      data: {
        websiteUrl: result.url,
        normalizedDomain: domainOf(result.url),
        email: email.toLowerCase(),
        preferredLanguage: language,
        permissionConfirmed: true,
        permissionConfirmedAt: new Date(),
        permissionIp: ip,
        freeScanCompleted: true,
        freeScanScore: result.scores.overall,
        freeScanJson: { ...result, render } as unknown as object,
        reportStatus: "free_scan_completed",
      },
      select: { id: true },
    });
    requestId = created.id;
  } catch (e) {
    console.error("[llm-scanner] lead store failed:", (e as Error).message);
  }

  return NextResponse.json({
    requestId,
    domain: result.domain,
    url: result.url,
    scores: result.scores,
    topIssues: localizeIssues(result.topIssues, language),
    render,
  });
}
