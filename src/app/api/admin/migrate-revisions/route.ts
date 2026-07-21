import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ONE-SHOT production migration: creates `article_revisions` (post revision
 * history). Protected by CRON_SECRET. Additive and idempotent — safe to run
 * more than once. DELETE THIS ROUTE once the migration has been applied.
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "article_revisions" (
     "id" TEXT NOT NULL,
     "articleId" TEXT NOT NULL,
     "languageId" TEXT NOT NULL,
     "snapshotJson" JSONB NOT NULL,
     "title" TEXT NOT NULL,
     "status" "ContentStatus" NOT NULL,
     "kind" TEXT NOT NULL DEFAULT 'save',
     "createdById" TEXT,
     "createdByName" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "article_revisions_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "article_revisions_articleId_languageId_createdAt_idx"
     ON "article_revisions"("articleId", "languageId", "createdAt")`,
  `DO $$ BEGIN
     ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_articleId_fkey"
       FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_languageId_fkey"
       FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applied: string[] = [];
  try {
    for (const [i, sql] of STATEMENTS.entries()) {
      await db.$executeRawUnsafe(sql);
      applied.push(`stmt_${i + 1}`);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, applied, error: (e as Error).message },
      { status: 500 }
    );
  }

  // Verify by reading the resulting shape back.
  const columns = await db.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'article_revisions' ORDER BY ordinal_position`
  );
  const rows = await db.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::int AS n FROM "article_revisions"`
  );

  return NextResponse.json({
    ok: true,
    applied,
    columns: columns.map((c) => `${c.column_name}:${c.data_type}`),
    existingRows: Number(rows[0]?.n ?? 0),
    note: "Migration complete. Delete /api/admin/migrate-revisions now.",
  });
}
