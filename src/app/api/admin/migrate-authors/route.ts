import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSetting } from "@/lib/settings";
import { CONTENT_SETTINGS_KEY, DEFAULT_CONTENT_SETTINGS } from "@/lib/authors";
import { DEFAULT_AUTHOR_SEED } from "@/lib/author-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot, token-protected migration + seed for the localized author system.
 * Idempotent: safe to run more than once. Because the production DATABASE_URL is
 * injected only at runtime (not reachable from the CLI), schema changes are
 * applied here with IF NOT EXISTS DDL, then the default author is seeded and
 * existing articles are backfilled. Delete this route after running in prod.
 *
 * Auth: ?token=<MIGRATION_TOKEN | CRON_SECRET>
 */
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "authors" (
    "id" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL,
    "displayNameHr" TEXT NOT NULL,
    "slugEn" TEXT NOT NULL,
    "slugHr" TEXT NOT NULL,
    "roleEn" TEXT,
    "roleHr" TEXT,
    "bioShortEn" TEXT,
    "bioShortHr" TEXT,
    "bioLongEn" TEXT,
    "bioLongHr" TEXT,
    "photoUrl" TEXT,
    "photoAltEn" TEXT,
    "photoAltHr" TEXT,
    "aboutPhotoUrl" TEXT,
    "aboutPhotoAltEn" TEXT,
    "aboutPhotoAltHr" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "linkedinUrl" TEXT,
    "xUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "githubUrl" TEXT,
    "expertiseTagsEnJson" JSONB,
    "expertiseTagsHrJson" JSONB,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'hr',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "authors_slugEn_key" ON "authors"("slugEn")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "authors_slugHr_key" ON "authors"("slugHr")`,
  `CREATE INDEX IF NOT EXISTS "authors_isActive_idx" ON "authors"("isActive")`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "authorProfileId" TEXT`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "lastTestedAt" TIMESTAMP(3)`,
  `ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "pricingCheckedAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "articles_authorProfileId_idx" ON "articles"("authorProfileId")`,
  `DO $$ BEGIN
     ALTER TABLE "articles" ADD CONSTRAINT "articles_authorProfileId_fkey"
       FOREIGN KEY ("authorProfileId") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const expected = process.env.MIGRATION_TOKEN || process.env.CRON_SECRET;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  try {
    for (const stmt of DDL) {
      await db.$executeRawUnsafe(stmt);
    }
    steps.push("schema_ok");

    // Seed the default author if none exists.
    let author = await db.author.findFirst({ where: { isDefault: true } });
    if (!author) {
      author = await db.author.create({ data: DEFAULT_AUTHOR_SEED });
      steps.push("default_author_created");
    } else {
      steps.push("default_author_exists");
    }

    // Mirror default author id into content settings.
    await setSetting(CONTENT_SETTINGS_KEY, { ...DEFAULT_CONTENT_SETTINGS, defaultAuthorId: author.id });

    // Backfill: assign the default author to any article without one.
    const backfilled = await db.article.updateMany({
      where: { authorProfileId: null },
      data: { authorProfileId: author.id },
    });
    steps.push(`backfilled_${backfilled.count}`);

    return NextResponse.json({ ok: true, steps, defaultAuthorId: author.id });
  } catch (e) {
    console.error("[migrate-authors] failed", e);
    return NextResponse.json({ ok: false, steps, error: (e as Error).message }, { status: 500 });
  }
}
