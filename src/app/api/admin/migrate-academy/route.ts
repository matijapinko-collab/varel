import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * One-shot, token-gated production migration for the Varel Academy columns on
 * `articles`. The Academy schema change shipped in the app deploy before the
 * production database had these columns, so every article query failed with
 * P2022 (column does not exist) and public pages 500'd. This adds them.
 *
 * Additive and idempotent — every statement uses IF NOT EXISTS, so re-running
 * is a no-op. Matches the exact column/index definitions from the local DB.
 * Delete this route once applied.
 *
 *   curl -X POST ".../api/admin/migrate-academy" -H "x-cron-secret: $CRON_SECRET"
 */
const STATEMENTS = [
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "contentSection" TEXT`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "academyFormat" TEXT`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "academyDifficulty" TEXT`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "academyStagesJson" JSONB`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "academyTopicIdsJson" JSONB`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "readingMinutes" INTEGER`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "academyPremium" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "learningPathId" TEXT`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "lessonPosition" INTEGER`,
  `CREATE INDEX IF NOT EXISTS "articles_contentSection_status_idx" ON "articles"("contentSection", "status")`,
];

export async function POST(req: NextRequest) {
  // Accepts either the standing CRON_SECRET or a throwaway MIGRATE_TOKEN set in
  // Vercel just for this run — both are removed once the migration is applied.
  const provided =
    req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("token");
  const accepted = [process.env.CRON_SECRET, process.env.MIGRATE_TOKEN].filter(Boolean);
  if (!provided || !accepted.includes(provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const applied: string[] = [];
  try {
    for (const stmt of STATEMENTS) {
      await db.$executeRawUnsafe(stmt);
      applied.push(stmt.slice(0, 70));
    }
    return NextResponse.json({ ok: true, count: applied.length, applied });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), applied },
      { status: 500 }
    );
  }
}
