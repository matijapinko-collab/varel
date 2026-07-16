import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getHvacSession } from "@/lib/hvac/b2b-auth";
import { customerDisplayName, SOURCE_LABELS, CUSTOMER_TYPE_LABELS, UNIT_TYPE_LABELS, UNIT_STATUS } from "@/lib/hvac/b2b-config";
import { toCsv } from "@/lib/hvac/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tenant-scoped CSV export for customers and units. */
export async function GET(_req: Request, ctx: { params: Promise<{ entity: string }> }) {
  const session = await getHvacSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.hvacTenantUser.findFirst({ where: { userId: session.uid, tenantId: session.tid, isActive: true } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = session.tid;
  const { entity } = await ctx.params;

  let csv = "";
  let filename = "izvoz.csv";

  if (entity === "klijenti") {
    const rows = await db.hvacCustomer.findMany({ where: { tenantId, archivedAt: null }, orderBy: { createdAt: "desc" } });
    csv = toCsv(
      ["naziv", "tip", "oib", "email", "telefon", "adresa", "grad", "postanski_broj", "izvor", "napomena"],
      rows.map((c) => [customerDisplayName(c), CUSTOMER_TYPE_LABELS[c.type], c.oib, c.email, c.phone, c.billingAddress, c.billingCity, c.billingPostalCode, SOURCE_LABELS[c.source], c.notes]),
    );
    filename = "varel-hvac-klijenti.csv";
  } else if (entity === "uredaji") {
    const rows = await db.hvacUnit.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { customer: true, location: { select: { name: true } } } });
    csv = toCsv(
      ["proizvodjac", "model", "serijski_broj", "vrsta", "status", "klijent", "lokacija", "sljedeci_servis"],
      rows.map((u) => [u.manufacturer, u.model, u.serialNumber, UNIT_TYPE_LABELS[u.unitType], UNIT_STATUS[u.status].label, customerDisplayName(u.customer), u.location?.name, u.nextServiceDate ? u.nextServiceDate.toISOString().slice(0, 10) : ""]),
    );
    filename = "varel-hvac-uredaji.csv";
  } else {
    return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
