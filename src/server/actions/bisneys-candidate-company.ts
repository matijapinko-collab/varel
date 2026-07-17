"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt } from "@/lib/bisneyscrm/forms";
import { COMPANY_RELATION_VALUES } from "@/lib/bisneyscrm/companies/candidate-links";
import type { BisneysCompanyRelationType } from "@/generated/prisma/client";

/** Links a candidate to a company with a typed relation. */
export async function linkCandidateToCompany(companyId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const candidateId = str(form.get("candidateId"));
  const relationRaw = str(form.get("relation"));
  if (!candidateId || !(COMPANY_RELATION_VALUES as string[]).includes(relationRaw)) {
    revalidatePath(`/bisneyscrm/companies/${companyId}`);
    return;
  }
  const relation = relationRaw as BisneysCompanyRelationType;
  await db.bisneysCandidateCompanyLink.create({
    data: { companyId, candidateId, relation, note: opt(form.get("note")), createdById: user.id },
  });
  await db.bisneysActivity.create({
    data: { type: "CANDIDATE_UPDATED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, companyId, newValue: `Veza s tvrtkom: ${relation}` },
  }).catch(() => {});
  await bisneysAudit({ userId: user.id, action: "candidate_company_linked", entityType: "company", entityId: companyId, after: { candidateId, relation } });
  revalidatePath(`/bisneyscrm/companies/${companyId}`);
  revalidatePath(`/bisneyscrm/candidates/${candidateId}`);
}

/** Soft-removes an explicit candidate↔company link. */
export async function unlinkCandidateFromCompany(linkId: string, companyId: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysCandidateCompanyLink.update({ where: { id: linkId }, data: { deletedAt: new Date() } }).catch(() => {});
  await bisneysAudit({ userId: user.id, action: "candidate_company_unlinked", entityType: "company", entityId: companyId, after: { linkId } });
  revalidatePath(`/bisneyscrm/companies/${companyId}`);
}
