import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot, token-protected migration for the Varel HVAC leads table.
 * Idempotent (IF NOT EXISTS / guarded enum). The production DATABASE_URL is
 * injected only at runtime, so schema changes are applied here. Delete this
 * route after running in prod. Auth: ?token=<MIGRATION_TOKEN | CRON_SECRET>
 */
const DDL: string[] = [
  `DO $$ BEGIN
     CREATE TYPE "HvacLeadStatus" AS ENUM ('NEW','CONTACTED','QUALIFIED','BETA_CANDIDATE','NOT_INTERESTED','CONVERTED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "hvac_leads" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "teamSize" TEXT,
    "city" TEXT,
    "currentSystem" TEXT,
    "interestedPlan" TEXT,
    "message" TEXT,
    "status" "HvacLeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'Varel HVAC',
    "sourcePage" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hvac_leads_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "hvac_leads_status_createdAt_idx" ON "hvac_leads"("status", "createdAt")`,
];

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const expected = process.env.MIGRATION_TOKEN || process.env.CRON_SECRET;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt);
    const count = await db.hvacLead.count();
    return NextResponse.json({ ok: true, leads: count });
  } catch (e) {
    console.error("[migrate-hvac] failed", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
