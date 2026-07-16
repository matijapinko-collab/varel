"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, decStr, intOrNull, dateOrNull } from "@/lib/bisneyscrm/forms";
import { SALES_STATUS_VALUES } from "@/lib/bisneyscrm/trello/mapping";
import type { BisneysSalesStatus } from "@/generated/prisma/client";

export type SaveResult = { error?: string };

const validStatus = (v: string): BisneysSalesStatus =>
  (SALES_STATUS_VALUES as string[]).includes(v) ? (v as BisneysSalesStatus) : "NEW_COMPANY";

/** Create or update a company (id present → update). Audits deal-value changes. */
export async function saveCompany(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const id = opt(form.get("id"));
  const name = str(form.get("name"));
  if (!name) return { error: "Naziv tvrtke je obavezan." };

  const data = {
    name,
    legalName: opt(form.get("legalName")),
    oib: opt(form.get("oib")),
    website: opt(form.get("website")),
    industry: opt(form.get("industry")),
    size: opt(form.get("size")),
    country: opt(form.get("country")),
    city: opt(form.get("city")),
    address: opt(form.get("address")),
    phone: opt(form.get("phone")),
    email: opt(form.get("email")),
    description: opt(form.get("description")),
    status: validStatus(str(form.get("status"))),
    leadSource: opt(form.get("leadSource")),
    dealValue: decStr(form.get("dealValue")),
    currency: opt(form.get("currency")) ?? "EUR",
    expectedCloseDate: dateOrNull(form.get("expectedCloseDate")),
    closeProbability: intOrNull(form.get("closeProbability")),
    nextFollowUpAt: dateOrNull(form.get("nextFollowUpAt")),
  };

  let companyId: string;
  if (id) {
    const existing = await db.bisneysCompany.findUnique({ where: { id }, select: { dealValue: true } });
    const updated = await db.bisneysCompany.update({ where: { id }, data });
    companyId = updated.id;
    const oldVal = existing?.dealValue?.toString() ?? null;
    const newVal = data.dealValue;
    if (oldVal !== newVal) {
      await db.bisneysActivity.create({
        data: {
          type: "DEAL_VALUE_CHANGED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id,
          entityType: "COMPANY", entityId: companyId, companyId, oldValue: oldVal, newValue: newVal,
        },
      });
    }
    await bisneysAudit({ userId: user.id, action: "company_updated", entityType: "company", entityId: companyId, after: { name } });
  } else {
    const created = await db.bisneysCompany.create({ data: { ...data, createdById: user.id, lastActivityAt: new Date() } });
    companyId = created.id;
    await db.bisneysActivity.create({
      data: { type: "COMPANY_CREATED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "COMPANY", entityId: companyId, companyId, newValue: name },
    });
    await bisneysAudit({ userId: user.id, action: "company_created", entityType: "company", entityId: companyId, after: { name } });
  }

  redirect(`/bisneyscrm/companies/${companyId}`);
}

export async function archiveCompany(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysCompany.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } });
  await bisneysAudit({ userId: user.id, action: "company_archived", entityType: "company", entityId: id });
  redirect("/bisneyscrm/companies");
}
