"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { getSetting, setSetting } from "@/lib/settings";
import { requirePermission, fd, fdNum } from "./helpers";
import { sendEmail } from "@/lib/email";
import { offerEmail, reportReadyEmail, packageSummary } from "@/lib/llm-scanner/emails";
import type { Lang } from "@/lib/llm-scanner/data";

const PAYMENT_KEY = "llm_manual_payment_instructions";
const DEFAULT_PAYMENT =
  "Bank transfer. Account holder: Pinko obrt, Zamlačka 28A, 10410 Velika Mlaka. OIB/VAT: HR12438213362. Please include the website domain in the payment description. Contact: matija@pinko.hr";

export async function getPaymentInstructions(): Promise<string> {
  return (await getSetting<string>(PAYMENT_KEY)) ?? DEFAULT_PAYMENT;
}

function site() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";
}
function rev(id: string) {
  revalidatePath("/administracija/llm-reports");
  revalidatePath(`/administracija/llm-reports/${id}`);
}

/** Save editable price, payment instructions and admin notes. */
export async function saveReportSettings(id: string, form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  const total = fdNum(form, "totalPrice");
  const instructions = fd(form, "paymentInstructions");
  const notes = fd(form, "adminNotes");
  if (instructions) await setSetting(PAYMENT_KEY, instructions, "LLM report manual payment instructions");
  await db.llmScanRequest.update({
    where: { id },
    data: { ...(total != null ? { totalPrice: total } : {}), adminNotes: notes || null },
  });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { section: "report_settings" } });
  rev(id);
}

export async function approveAndSendOffer(id: string) {
  const { userId } = await requirePermission("settings.manage");
  const r = await db.llmScanRequest.findUnique({ where: { id } });
  if (!r) return;
  const lang = (r.preferredLanguage as Lang) ?? "en";
  const instructions = await getPaymentInstructions();
  const mail = offerEmail(lang, {
    name: r.name ?? "",
    websiteUrl: r.websiteUrl,
    packageSummary: packageSummary(lang, r.socialProfileAddon, r.competitorAddon),
    totalPrice: r.totalPrice,
    manualPaymentInstructions: instructions,
  });
  const res = await sendEmail({ to: r.email, subject: mail.subject, text: mail.text });
  await db.llmScanRequest.update({
    where: { id },
    data: {
      reportStatus: "offer_sent",
      paymentStatus: "offer_sent",
      adminNotes: res.sent ? r.adminNotes : `${r.adminNotes ?? ""}\n[Offer email NOT sent — ${res.error}. Configure RESEND_API_KEY/EMAIL_FROM.]`.trim(),
    },
  });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "offer_sent", emailSent: res.sent } });
  rev(id);
}

export async function markPaid(id: string) {
  const { userId } = await requirePermission("settings.manage");
  await db.llmScanRequest.update({ where: { id }, data: { paymentStatus: "paid", reportStatus: "paid" } });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "marked_paid" } });
  rev(id);
}

/** Builds the report draft from the free scan + generates private/public links. */
export async function generateReport(id: string) {
  const { userId } = await requirePermission("settings.manage");
  const r = await db.llmScanRequest.findUnique({ where: { id } });
  if (!r) return;
  const token = r.privateReportToken ?? crypto.randomBytes(24).toString("hex");
  const slug = r.publicShareSlug ?? `${r.normalizedDomain.replace(/[^a-z0-9]+/gi, "-")}-${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
  await db.llmScanRequest.update({
    where: { id },
    data: {
      reportStatus: "report_draft_ready",
      privateReportToken: token,
      publicShareSlug: slug,
      reportJson: (r.reportJson ?? r.freeScanJson) as object,
    },
  });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "report_generated" } });
  rev(id);
}

export async function approveAndSendReport(id: string) {
  const { userId } = await requirePermission("settings.manage");
  const r = await db.llmScanRequest.findUnique({ where: { id } });
  if (!r || !r.privateReportToken) return;
  const lang = (r.preferredLanguage as Lang) ?? "en";
  const s = site();
  const mail = reportReadyEmail(lang, {
    name: r.name ?? "",
    privateReportUrl: `${s}/${lang}/report/private/${r.privateReportToken}`,
    publicShareUrl: r.publicShareSlug ? `${s}/${lang}/report/share/${r.publicShareSlug}` : "—",
    implementationOfferUrl: `${s}/${lang}/varel-tools/llm-visibility-scanner`,
  });
  const res = await sendEmail({ to: r.email, subject: mail.subject, text: mail.text });
  await db.llmScanRequest.update({
    where: { id },
    data: { finalReportApprovedByAdmin: true, approvedByAdminAt: new Date(), reportStatus: "sent" },
  });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "report_sent", emailSent: res.sent } });
  rev(id);
}

export async function togglePublicShare(id: string) {
  const { userId } = await requirePermission("settings.manage");
  const r = await db.llmScanRequest.findUnique({ where: { id }, select: { publicShareEnabled: true } });
  await db.llmScanRequest.update({ where: { id }, data: { publicShareEnabled: !r?.publicShareEnabled } });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "toggle_public_share" } });
  rev(id);
}

export async function rejectRequest(id: string) {
  const { userId } = await requirePermission("settings.manage");
  await db.llmScanRequest.update({ where: { id }, data: { reportStatus: "rejected" } });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "rejected" } });
  rev(id);
}

export async function archiveRequest(id: string) {
  const { userId } = await requirePermission("settings.manage");
  await db.llmScanRequest.update({ where: { id }, data: { reportStatus: "archived" } });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LLM_REPORT", entityId: id, details: { action: "archived" } });
  rev(id);
}
