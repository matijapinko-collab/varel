import { NextResponse } from "next/server";
import { getHvacSession } from "@/lib/hvac/b2b-auth";

export const runtime = "nodejs";

/** Croatian CSV template for customer import. */
export async function GET() {
  if (!(await getHvacSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const header = "tip,ime,prezime,naziv_tvrtke,oib,email,telefon,adresa,grad,postanski_broj,napomena";
  const example = "fizicka,Ana,Perić,,, ana@example.hr,0912345678,Ilica 1,Zagreb,10000,";
  const csv = `${header}\n${example}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="varel-hvac-klijenti-predlozak.csv"',
    },
  });
}
