import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeUrl, domainOf } from "@/lib/llm-scanner/scan";
import { PRICING } from "@/lib/llm-scanner/data";
import { sendEmail, adminNotifyEmail } from "@/lib/email";
import { adminNotificationEmail } from "@/lib/llm-scanner/emails";

export const runtime = "nodejs";

const schema = z.object({
  requestId: z.string().optional(),
  name: z.string().max(120).optional(),
  email: z.string().email().max(254),
  companyName: z.string().max(160).optional(),
  websiteUrl: z.string().min(3).max(300),
  language: z.enum(["en", "hr"]).default("en"),
  pageSelectionMethod: z.enum(["manual", "auto_detect"]).default("auto_detect"),
  additionalUrls: z.array(z.string().max(300)).max(4).optional(),
  socialProfileAddon: z.boolean().default(false),
  socialProfileUrls: z.array(z.string().max(300)).max(12).optional(),
  competitorAddon: z.boolean().default(false),
  competitorUrl: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  consent: z.literal(true),
  permission: z.literal(true),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;
  const website = normalizeUrl(d.websiteUrl);
  if (!website) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const addonPrice = (d.socialProfileAddon ? PRICING.socialAddon : 0) + (d.competitorAddon ? PRICING.competitorAddon : 0);
  const totalPrice = PRICING.base + addonPrice;

  const data = {
    name: d.name || null,
    companyName: d.companyName || null,
    preferredLanguage: d.language,
    detailedReportRequested: true,
    pageSelectionMethod: d.pageSelectionMethod,
    additionalUrlsJson: (d.additionalUrls ?? []).map((u) => normalizeUrl(u)).filter(Boolean),
    socialProfileAddon: d.socialProfileAddon,
    socialProfileUrlsJson: d.socialProfileUrls ?? [],
    competitorAddon: d.competitorAddon,
    competitorUrl: d.competitorUrl ? normalizeUrl(d.competitorUrl) : null,
    basePrice: PRICING.base,
    addonPrice,
    totalPrice,
    reportStatus: "waiting_admin_review",
    adminNotes: d.notes ? `Client notes: ${d.notes}` : null,
  };

  let requestId: string;
  let freeScore = 0;
  try {
    if (d.requestId) {
      const existing = await db.llmScanRequest.findUnique({ where: { id: d.requestId }, select: { id: true, freeScanScore: true } });
      if (existing) {
        await db.llmScanRequest.update({ where: { id: d.requestId }, data });
        requestId = existing.id;
        freeScore = existing.freeScanScore ?? 0;
      } else {
        const created = await createNew();
        requestId = created.id;
      }
    } else {
      const created = await createNew();
      requestId = created.id;
    }
  } catch (e) {
    console.error("[llm-scanner] request store failed:", (e as Error).message);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  async function createNew() {
    return db.llmScanRequest.create({
      data: {
        websiteUrl: website!,
        normalizedDomain: domainOf(website!),
        email: d.email.toLowerCase(),
        permissionConfirmed: true,
        permissionConfirmedAt: new Date(),
        ...data,
      },
      select: { id: true },
    });
  }

  // Notify admin (best-effort — skipped gracefully when email isn't configured).
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";
  const mail = adminNotificationEmail({
    domain: domainOf(website),
    name: d.name ?? "",
    email: d.email,
    company: d.companyName ?? "",
    websiteUrl: website,
    language: d.language,
    socialAddon: d.socialProfileAddon,
    competitorAddon: d.competitorAddon,
    totalPrice,
    freeScore,
    adminUrl: `${site}/administracija/llm-reports/${requestId}`,
  });
  void sendEmail({ to: adminNotifyEmail(), subject: mail.subject, text: mail.text, replyTo: d.email });

  return NextResponse.json({ ok: true, requestId, totalPrice });
}
