import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import { sendEmail, adminNotifyEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  teamSize: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  currentSystem: z.string().trim().max(80).optional().or(z.literal("")),
  interestedPlan: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true),
  sourcePage: z.string().trim().max(120).optional(),
  // Honeypot — must stay empty (bots fill it).
  website: z.string().max(0).optional().or(z.literal("")),
});

const RATE_WINDOW_MIN = 10;
const RATE_MAX = 3;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Honeypot triggered → pretend success so bots don't learn.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const d = parsed.data;

  const meta = await requestMeta();

  // DB-backed rate limiting by hashed IP (works in serverless).
  if (meta.ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000);
    const recent = await db.hvacLead.count({ where: { ipHash: meta.ipHash, createdAt: { gte: since } } }).catch(() => 0);
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  let lead;
  try {
    lead = await db.hvacLead.create({
      data: {
        fullName: d.fullName,
        company: d.company,
        email: d.email.toLowerCase(),
        phone: d.phone || null,
        teamSize: d.teamSize || null,
        city: d.city || null,
        currentSystem: d.currentSystem || null,
        interestedPlan: d.interestedPlan || null,
        message: d.message || null,
        sourcePage: d.sourcePage || "/hvac",
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      },
    });
  } catch (e) {
    console.error("[hvac/lead] create failed", (e as Error).message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Notify admin (graceful — never blocks the response on email failure).
  const text = [
    "Nova Varel HVAC prijava za rani pristup",
    "",
    `Ime i prezime: ${d.fullName}`,
    `Tvrtka/obrt: ${d.company}`,
    `E-mail: ${d.email}`,
    d.phone ? `Telefon: ${d.phone}` : null,
    d.teamSize ? `Broj majstora: ${d.teamSize}` : null,
    d.city ? `Grad/područje: ${d.city}` : null,
    d.currentSystem ? `Trenutni sustav: ${d.currentSystem}` : null,
    d.interestedPlan ? `Zanima ga paket: ${d.interestedPlan}` : null,
    d.message ? `Poruka: ${d.message}` : null,
    "",
    "Izvor: Varel HVAC landing (/hvac)",
  ].filter(Boolean).join("\n");

  await sendEmail({
    to: adminNotifyEmail(),
    subject: `Varel HVAC — nova prijava: ${d.company}`,
    text,
    replyTo: d.email,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: lead.id });
}
