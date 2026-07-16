"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str } from "@/lib/bisneyscrm/forms";

/** Merge duplicate people into `keepId` (brief §57/§28). Audited, never silent. */
export async function mergePeople(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const keepId = str(form.get("keepId"));
  const mergeIds = String(form.get("mergeIds") ?? "").split(",").filter((x) => x && x !== keepId);
  if (!keepId || mergeIds.length === 0) { revalidatePath("/bisneyscrm/settings/duplicates"); return; }

  const keep = await db.bisneysCandidate.findFirst({ where: { personId: keepId }, select: { id: true } });
  const keepTrello = await db.bisneysTrelloMember.findFirst({ where: { personId: keepId }, select: { id: true } });

  for (const mid of mergeIds) {
    await db.bisneysPersonRole.updateMany({ where: { personId: mid }, data: { personId: keepId } });
    await db.bisneysCompanyMembership.updateMany({ where: { personId: mid }, data: { personId: keepId } });
    await db.bisneysContact.updateMany({ where: { personId: mid }, data: { personId: keepId } });
    await db.bisneysRelationship.updateMany({ where: { sourcePersonId: mid }, data: { sourcePersonId: keepId } });
    await db.bisneysRelationship.updateMany({ where: { targetPersonId: mid }, data: { targetPersonId: keepId } });
    await db.bisneysReferral.updateMany({ where: { referrerPersonId: mid }, data: { referrerPersonId: keepId } });
    await db.bisneysReferral.updateMany({ where: { referredPersonId: mid }, data: { referredPersonId: keepId } });
    await db.bisneysActivity.updateMany({ where: { personId: mid }, data: { personId: keepId } });
    await db.bisneysComment.updateMany({ where: { personId: mid }, data: { personId: keepId } });
    await db.bisneysCall.updateMany({ where: { personId: mid }, data: { personId: keepId } });

    // Unique 1-1 links only move when the kept person doesn't already have one.
    if (!keep) await db.bisneysCandidate.updateMany({ where: { personId: mid }, data: { personId: keepId } }).catch(() => {});
    if (!keepTrello) await db.bisneysTrelloMember.updateMany({ where: { personId: mid }, data: { personId: keepId } }).catch(() => {});

    await db.bisneysPerson.update({ where: { id: mid }, data: { deletedAt: new Date(), deletedById: user.id } });
    await bisneysAudit({ userId: user.id, action: "person_merged", entityType: "person", entityId: keepId, after: { mergedFrom: mid } });
  }
  revalidatePath("/bisneyscrm/settings/duplicates");
}

/** Merge duplicate companies into `keepId`. */
export async function mergeCompanies(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const keepId = str(form.get("keepId"));
  const mergeIds = String(form.get("mergeIds") ?? "").split(",").filter((x) => x && x !== keepId);
  if (!keepId || mergeIds.length === 0) { revalidatePath("/bisneyscrm/settings/duplicates"); return; }

  for (const mid of mergeIds) {
    await db.bisneysContact.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysCompanyMembership.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysDeal.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysLead.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysJob.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysActivity.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysCall.updateMany({ where: { companyId: mid }, data: { companyId: keepId } });
    await db.bisneysCompany.update({ where: { id: mid }, data: { deletedAt: new Date(), deletedById: user.id } });
    await bisneysAudit({ userId: user.id, action: "company_merged", entityType: "company", entityId: keepId, after: { mergedFrom: mid } });
  }
  revalidatePath("/bisneyscrm/settings/duplicates");
}
