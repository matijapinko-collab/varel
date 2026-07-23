import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ELECTRO_MIGRATION_SQL } from "@/lib/electro/migration-sql";

/**
 * ONE-SHOT production migration endpoint (same rollout pattern as Bisneys CRM).
 * The prod DATABASE_URL is injected by the Prisma integration and reachable only
 * from inside the deployment, so the electro_* schema is created here.
 *
 * Safety: applies ONLY the fixed, bundled ELECTRO_MIGRATION_SQL constant — no
 * SQL is ever taken from the request. Gated by ELECTRO_MIGRATE_TOKEN and a
 * no-op once the tables exist. Delete this route after the migration succeeds.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fixedStatements(): string[] {
  return ELECTRO_MIGRATION_SQL.split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

export async function POST(req: NextRequest) {
  const token = process.env.ELECTRO_MIGRATE_TOKEN;
  if (!token || req.headers.get("x-electro-migrate-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Already migrated? Do nothing.
  try {
    const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
      "SELECT to_regclass('public.electro_companies') IS NOT NULL AS exists"
    );
    if (rows[0]?.exists) return NextResponse.json({ ok: true, alreadyApplied: true });
  } catch {
    /* proceed to apply */
  }

  const statements = fixedStatements();
  try {
    await db.$transaction(async (tx) => {
      for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, applied: statements.length });
}
