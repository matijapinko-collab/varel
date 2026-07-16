import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { generateRemindersForTenant } from "@/server/actions/hvac-reminders";
import { recomputedStatus } from "@/lib/hvac/reminders";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Daily HVAC service-reminder maintenance (Vercel Cron → vercel.json).
 * Protected by CRON_SECRET. No-op while HVAC_B2B_ENABLED is unset so it never
 * touches hvac_* tables before the module goes live.
 *
 * 1. Generates reminders for units with a nextServiceDate but no active one.
 * 2. Recomputes FUTURE/UPCOMING/READY buckets from the due date (manual
 *    states like CONTACTED / BOOKED are left untouched).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isHvacB2bEnabled()) {
    return NextResponse.json({ ok: true, skipped: "hvac_disabled" });
  }

  const now = new Date();
  const tenants = await db.hvacTenant.findMany({
    where: { deletedAt: null, status: { notIn: ["SUSPENDED", "CANCELLED"] } },
    select: { id: true },
  });

  let generated = 0;
  let restatused = 0;

  for (const t of tenants) {
    generated += await generateRemindersForTenant(t.id);

    const open = await db.hvacServiceReminder.findMany({
      where: { tenantId: t.id, status: { in: ["FUTURE", "UPCOMING", "READY"] } },
      select: { id: true, status: true, nextServiceDate: true },
    });
    for (const r of open) {
      const next = recomputedStatus(r.status, r.nextServiceDate, now);
      if (next) {
        await db.hvacServiceReminder.update({ where: { id: r.id }, data: { status: next } });
        restatused++;
      }
    }
  }

  return NextResponse.json({ ok: true, tenants: tenants.length, generated, restatused });
}
