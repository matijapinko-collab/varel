import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ONE-SHOT additive migration for the standardized post editor fields.
 * Adds nullable columns (ADD COLUMN IF NOT EXISTS) to articles +
 * article_translations, ensures the ContentStatus enum has SCHEDULED, and adds
 * an index. Non-destructive and idempotent. Protected by CRON_SECRET or a
 * one-time token. DELETE this route after running it once.
 */

const ONE_TIME_TOKEN = "29a423ef7417f0bd7d24b3d9370948a09afbaf62252b64d0";

const ARTICLE_COLS: [string, string][] = [
  ["primaryCategoryId", "TEXT"],
  ["secondaryCategoryIdsJson", "JSONB"],
  ["prosConsEnabled", "BOOLEAN NOT NULL DEFAULT false"],
  ["comparisonEnabled", "BOOLEAN NOT NULL DEFAULT false"],
  ["comparisonToolAId", "TEXT"],
  ["comparisonToolBId", "TEXT"],
  ["varelVerdictEnabled", "BOOLEAN NOT NULL DEFAULT false"],
  ["reviewerId", "TEXT"],
  ["lastReviewedAt", "TIMESTAMP(3)"],
];

const TR_COLS: [string, string][] = [
  ["featuredImageAlt", "TEXT"],
  ["prosConsHeading", "TEXT"],
  ["prosConsIntro", "TEXT"],
  ["prosJson", "JSONB"],
  ["consJson", "JSONB"],
  ["comparisonHeading", "TEXT"],
  ["comparisonSummary", "TEXT"],
  ["comparisonCtaLabel", "TEXT"],
  ["comparisonCtaUrl", "TEXT"],
  ["aiSummary", "TEXT"],
  ["directAnswer", "TEXT"],
  ["keyTakeawaysJson", "JSONB"],
  ["bestForJson", "JSONB"],
  ["notIdealForJson", "JSONB"],
  ["mentionedEntityIdsJson", "JSONB"],
  ["mentionedEntitiesText", "TEXT"],
  ["sourceReferencesJson", "JSONB"],
  ["varelVerdictHeadline", "TEXT"],
  ["varelVerdictSummary", "TEXT"],
  ["varelVerdictBestFor", "TEXT"],
  ["varelVerdictSkipIf", "TEXT"],
  ["varelVerdictRating", "DOUBLE PRECISION"],
  ["seoCompletionScore", "INTEGER"],
  ["llmCompletionScore", "INTEGER"],
  ["publishChecklistJson", "JSONB"],
];

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const token = new URL(request.url).searchParams.get("token");
  if (!((secret && auth === `Bearer ${secret}`) || token === ONE_TIME_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary: Record<string, unknown> = {};
  try {
    // Ensure the SCHEDULED enum value exists (safe if already present).
    await db.$executeRawUnsafe(`ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED'`);

    for (const [col, type] of ARTICLE_COLS) {
      await db.$executeRawUnsafe(`ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "${col}" ${type}`);
    }
    for (const [col, type] of TR_COLS) {
      await db.$executeRawUnsafe(`ALTER TABLE "article_translations" ADD COLUMN IF NOT EXISTS "${col}" ${type}`);
    }
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "articles_primaryCategoryId_idx" ON "articles" ("primaryCategoryId")`
    );

    summary.articleColumns = ARTICLE_COLS.length;
    summary.translationColumns = TR_COLS.length;
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("[migrate-post-fields] failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message, summary }, { status: 500 });
  }
}
