import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(254),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  serviceId: z.string().trim().max(40).optional().or(z.literal("")),
  preferredDate: z.string().trim().max(40).optional().or(z.literal("")),
  preferredTimeRange: z.string().trim().max(60).optional().or(z.literal("")),
  deviceCount: z.coerce.number().int().min(0).max(100).optional(),
  manufacturer: z.string().trim().max(80).optional().or(z.literal("")),
  issueDescription: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true),
  // Honeypot — bots fill it, humans never see it.
  website: z.string().max(0).optional().or(z.literal("")),
});

const RATE_WINDOW_MIN = 10;
const RATE_MAX = 3;

export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!isHvacB2bEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const { slug } = await ctx.params;

  const tenant = await db.hvacTenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, email: true, bookingSettings: { select: { enabled: true, autoConfirm: true, publicEmail: true } } },
  });
  if (!tenant || !tenant.bookingSettings?.enabled) {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const d = parsed.data;

  const meta = await requestMeta();
  if (meta.ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000);
    const recent = await db.hvacBookingSubmission.count({ where: { tenantId: tenant.id, ipHash: meta.ipHash, createdAt: { gte: since } } }).catch(() => 0);
    if (recent >= RATE_MAX) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Validate the service belongs to this tenant (ignore otherwise).
  let serviceId: string | null = null;
  if (d.serviceId) {
    const svc = await db.hvacService.findFirst({ where: { id: d.serviceId, tenantId: tenant.id }, select: { id: true } });
    serviceId = svc?.id ?? null;
  }
  const preferredDate = d.preferredDate ? new Date(d.preferredDate) : null;

  try {
    const inquiry = await db.hvacInquiry.create({
      data: {
        tenantId: tenant.id, leadName: d.name, leadPhone: d.phone, leadEmail: d.email.toLowerCase(),
        serviceId, source: "HOSTED_BOOKING",
        preferredTime: [d.preferredDate, d.preferredTimeRange].filter(Boolean).join(" ") || null,
        issueDescription: d.issueDescription || null,
        note: [d.address, d.city].filter(Boolean).join(", ") || null,
      },
    });
    await db.hvacBookingSubmission.create({
      data: {
        tenantId: tenant.id, name: d.name, phone: d.phone, email: d.email.toLowerCase(),
        address: d.address || null, city: d.city || null, serviceId, preferredDate,
        preferredTimeRange: d.preferredTimeRange || null, deviceCount: d.deviceCount ?? null,
        manufacturer: d.manufacturer || null, issueDescription: d.issueDescription || null,
        inquiryId: inquiry.id, ipHash: meta.ipHash ?? null,
      },
    });

    const to = tenant.bookingSettings.publicEmail || tenant.email;
    if (to) {
      await sendEmail({
        to,
        subject: `Novi zahtjev za termin — ${d.name}`,
        text: [
          `Novi zahtjev putem online bookinga (${tenant.name}):`, "",
          `Ime: ${d.name}`, `Telefon: ${d.phone}`, `E-mail: ${d.email}`,
          d.address || d.city ? `Adresa: ${[d.address, d.city].filter(Boolean).join(", ")}` : "",
          d.preferredDate ? `Željeni termin: ${d.preferredDate} ${d.preferredTimeRange ?? ""}`.trim() : "",
          d.manufacturer ? `Proizvođač: ${d.manufacturer}` : "",
          d.issueDescription ? `Opis: ${d.issueDescription}` : "",
          "", `Otvorite u aplikaciji: /hvac-b2b/upiti/${inquiry.id}`,
        ].filter(Boolean).join("\n"),
        replyTo: d.email,
      });
    }
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, autoConfirm: tenant.bookingSettings.autoConfirm });
}
