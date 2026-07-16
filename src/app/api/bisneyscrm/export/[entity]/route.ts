import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { toCsv } from "@/lib/bisneyscrm/forms";
import { SALES_STATUS_LABELS } from "@/lib/bisneyscrm/trello/mapping";
import { CANDIDATE_STATUS_LABELS, shortDate } from "@/lib/bisneyscrm/format";

/** Server-side CSV export for CRM list views (brief §24/§52). Auth required. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ entity: string }> }) {
  const user = await getBisneysUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { entity } = await ctx.params;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const like = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const filename = entity;
  let csv = "";

  if (entity === "companies") {
    const rows = await db.bisneysCompany.findMany({
      where: { deletedAt: null, ...(q ? { OR: [{ name: like }, { city: like }, { industry: like }] } : {}) },
      orderBy: { name: "asc" },
    });
    csv = toCsv(
      ["Naziv", "Status", "Industrija", "Grad", "Država", "Telefon", "Email", "Vrijednost", "Valuta", "Zadnja aktivnost"],
      rows.map((c) => [c.name, SALES_STATUS_LABELS[c.status], c.industry, c.city, c.country, c.phone, c.email, c.dealValue?.toString() ?? "", c.currency ?? "", shortDate(c.lastActivityAt)])
    );
  } else if (entity === "candidates") {
    const rows = await db.bisneysCandidate.findMany({
      where: { deletedAt: null }, include: { person: true }, orderBy: { createdAt: "desc" },
    });
    csv = toCsv(
      ["Ime", "Status", "Zanimanje", "Telefon", "Email", "Grad", "Godine iskustva", "Recruiter"],
      rows.map((c) => [c.person.fullName, CANDIDATE_STATUS_LABELS[c.status], c.currentPosition, c.person.phone, c.person.email, c.person.city, c.yearsExperience, c.recruiterId])
    );
  } else if (entity === "jobs") {
    const rows = await db.bisneysJob.findMany({
      where: { deletedAt: null }, include: { profession: true, client: true }, orderBy: { createdAt: "desc" },
    });
    csv = toCsv(
      ["Naziv", "Profesija", "Klijent", "Lokacija", "Broj radnika", "Plaća", "Status"],
      rows.map((j) => [j.title, j.profession?.name ?? "", j.client?.name ?? "", j.location, j.headcount, j.salary, j.status])
    );
  } else if (entity === "people") {
    const rows = await db.bisneysPerson.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" } });
    csv = toCsv(
      ["Ime", "Email", "Telefon", "Grad", "Država"],
      rows.map((p) => [p.fullName, p.email, p.phone, p.city, p.country])
    );
  } else {
    return NextResponse.json({ error: "unknown_entity" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bisneys-${filename}.csv"`,
    },
  });
}
