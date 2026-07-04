import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { audit } from "@/lib/security";
import { importOffersFromCsv } from "@/server/import-offers";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Manual CSV upload for product offers. Parsing/upsert logic lives in
 * src/server/import-offers.ts (shared with the partner feed fetcher + cron).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !roleCan(session.user.role, "affiliate.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "CSV too large (max 2 MB)." }, { status: 413 });
  }

  const report = await importOffersFromCsv(await file.text());
  if ("error" in report) {
    return NextResponse.json({ error: report.error }, { status: 400 });
  }

  await audit({
    userId: session.user.id,
    action: "AFFILIATE_UPDATE",
    entityType: "OFFER_IMPORT",
    details: {
      filename: file.name,
      rows: report.rows,
      created: report.created,
      updated: report.updated,
      errorCount: report.errors.length,
    } as Prisma.InputJsonValue,
  });

  return NextResponse.json(report);
}
