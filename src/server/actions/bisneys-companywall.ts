"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser, requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, intOrNull, decStr, dateOrNull } from "@/lib/bisneyscrm/forms";
import { saveCompanyWallConnection, disconnectCompanyWall } from "@/lib/bisneyscrm/companywall/connection";
import { companyWallSearch } from "@/lib/bisneyscrm/companywall/client";
import { normalizeOib } from "@/lib/bisneyscrm/companywall/normalize";

const SETTINGS = "/bisneyscrm/settings/integrations/companywall";

/** Superadmin: store encrypted CompanyWall API credentials. */
export async function saveCompanyWallConnectionAction(form: FormData): Promise<void> {
  const user = await requireBisneysSuperadmin();
  const apiUrl = str(form.get("apiUrl"));
  const apiKey = str(form.get("apiKey"));
  if (!apiUrl || !apiKey) redirect(`${SETTINGS}?msg=missing`);
  await saveCompanyWallConnection({ apiUrl, country: opt(form.get("country")), apiKey, apiSecret: opt(form.get("apiSecret")) });
  await bisneysAudit({ userId: user.id, action: "companywall_connected", entityType: "integration" });
  redirect(`${SETTINGS}?msg=saved`);
}

export async function disconnectCompanyWallAction(): Promise<void> {
  const user = await requireBisneysSuperadmin();
  await disconnectCompanyWall();
  await bisneysAudit({ userId: user.id, action: "companywall_disconnected", entityType: "integration" });
  redirect(`${SETTINGS}?msg=disconnected`);
}

/** Tests the connection by attempting a search; surfaces the API/stub message. */
export async function testCompanyWallConnection(): Promise<void> {
  await requireBisneysSuperadmin();
  try {
    await companyWallSearch({ name: "test" });
    redirect(`${SETTINGS}?msg=ok`);
  } catch (e) {
    if (e instanceof Error && /NEXT_REDIRECT/.test(e.message)) throw e;
    redirect(`${SETTINGS}?msg=${encodeURIComponent(e instanceof Error ? e.message : "error")}`);
  }
}

/**
 * Manual CompanyWall link (works today, before the live API): a recruiter enters
 * the confirmed legal data. Stored as a separate profile (source MANUAL) so it
 * never overwrites the company's own fields.
 */
export async function linkCompanyWallManual(companyId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const oib = normalizeOib(str(form.get("oib")));
  const data = {
    legalName: opt(form.get("legalName")), oib, mbs: opt(form.get("mbs")), status: opt(form.get("status")),
    legalForm: opt(form.get("legalForm")), vatStatus: opt(form.get("vatStatus")),
    address: opt(form.get("address")), city: opt(form.get("city")), postalCode: opt(form.get("postalCode")),
    nkd: opt(form.get("nkd")), activity: opt(form.get("activity")),
    employeeCount: intOrNull(form.get("employeeCount")),
    revenue: decStr(form.get("revenue")), creditRating: opt(form.get("creditRating")),
    foundedAt: dateOrNull(form.get("foundedAt")),
    country: opt(form.get("country")) ?? "HR", source: "MANUAL", matchMethod: "manual",
    matchedById: user.id, fetchedAt: new Date(),
  };
  await db.bisneysCompanyWallProfile.upsert({
    where: { companyId }, create: { companyId, ...data }, update: data,
  });
  await bisneysAudit({ userId: user.id, action: "companywall_linked_manual", entityType: "company", entityId: companyId, after: { oib } });
  revalidatePath(`/bisneyscrm/companies/${companyId}`);
}

/** Refreshes from the live API (graceful until the contract is wired). */
export async function refreshCompanyWall(companyId: string): Promise<void> {
  const user = await requireBisneysUser();
  const company = await db.bisneysCompany.findUnique({ where: { id: companyId }, select: { name: true } });
  const existing = await db.bisneysCompanyWallProfile.findUnique({ where: { companyId }, select: { oib: true } });
  try {
    const results = await companyWallSearch({ oib: existing?.oib ?? undefined, name: company?.name });
    const top = results[0];
    if (top) {
      await db.bisneysCompanyWallProfile.upsert({
        where: { companyId },
        create: { companyId, source: "COMPANYWALL", fetchedAt: new Date(), legalName: top.legalName, oib: top.oib, raw: top.raw as object },
        update: { source: "COMPANYWALL", fetchedAt: new Date(), legalName: top.legalName, oib: top.oib, raw: top.raw as object },
      });
    }
    await bisneysAudit({ userId: user.id, action: "companywall_refreshed", entityType: "company", entityId: companyId });
    redirect(`/bisneyscrm/companies/${companyId}?cw=ok`);
  } catch (e) {
    if (e instanceof Error && /NEXT_REDIRECT/.test(e.message)) throw e;
    redirect(`/bisneyscrm/companies/${companyId}?cw=${encodeURIComponent(e instanceof Error ? e.message : "error")}`);
  }
}

export async function unlinkCompanyWall(companyId: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysCompanyWallProfile.deleteMany({ where: { companyId } });
  await bisneysAudit({ userId: user.id, action: "companywall_unlinked", entityType: "company", entityId: companyId });
  revalidatePath(`/bisneyscrm/companies/${companyId}`);
}
