"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { ensureRelationshipTypes } from "@/lib/bisneyscrm/relationships";
import { generateEmploymentSuggestions } from "@/lib/bisneyscrm/relationships/suggestions";
import { str, opt, boolOf, dateOrNull } from "@/lib/bisneyscrm/forms";

/* ---------------- employment history (brief §17) ---------------- */

export async function addEmployment(personId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const companyId = opt(form.get("companyId"));
  const companyName = opt(form.get("companyName"));
  if (!companyId && !companyName) redirect(`/bisneyscrm/people/${personId}`);
  await db.bisneysEmployment.create({
    data: {
      personId, companyId, companyName,
      title: opt(form.get("title")), department: opt(form.get("department")),
      startDate: dateOrNull(form.get("startDate")), endDate: dateOrNull(form.get("endDate")),
      isCurrent: boolOf(form.get("isCurrent")), source: "BISNEYS_CRM", confirmed: true, createdById: user.id,
    },
  });
  await bisneysAudit({ userId: user.id, action: "employment_added", entityType: "person", entityId: personId, after: { companyId, companyName } });
  redirect(`/bisneyscrm/people/${personId}`);
}

export async function deleteEmployment(id: string, personId: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysEmployment.update({ where: { id }, data: { deletedAt: new Date() } });
  await bisneysAudit({ userId: user.id, action: "employment_removed", entityType: "person", entityId: personId });
  redirect(`/bisneyscrm/people/${personId}`);
}

/* ---------------- person roles (brief §11) ---------------- */

export async function addPersonRole(personId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const role = str(form.get("role"));
  if (role) {
    const exists = await db.bisneysPersonRole.findFirst({ where: { personId, role } });
    if (!exists) {
      await db.bisneysPersonRole.create({ data: { personId, role } });
      await bisneysAudit({ userId: user.id, action: "person_role_added", entityType: "person", entityId: personId, after: { role } });
    }
  }
  redirect(`/bisneyscrm/people/${personId}`);
}

export async function removePersonRole(id: string, personId: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysPersonRole.delete({ where: { id } }).catch(() => {});
  await bisneysAudit({ userId: user.id, action: "person_role_removed", entityType: "person", entityId: personId });
  redirect(`/bisneyscrm/people/${personId}`);
}

/* ---------------- suggestions (brief §33/§34) ---------------- */

export async function runSuggestions(): Promise<void> {
  await requireBisneysUser();
  await generateEmploymentSuggestions();
  revalidatePath("/bisneyscrm/relationships");
}

export async function confirmSuggestion(id: string): Promise<void> {
  const user = await requireBisneysUser();
  const sug = await db.bisneysRelationshipSuggestion.findUnique({ where: { id } });
  if (!sug || sug.status !== "PENDING") { revalidatePath("/bisneyscrm/relationships"); return; }
  await ensureRelationshipTypes();
  const type = sug.suggestedType
    ? await db.bisneysRelationshipType.findFirst({ where: { name: sug.suggestedType } })
    : null;
  const fallback = type ?? (await db.bisneysRelationshipType.findFirst({ where: { name: "Bivši kolega" } }));
  if (fallback) {
    const confidenceScore = sug.confidence === "HIGH" ? 85 : sug.confidence === "MEDIUM" ? 60 : 35;
    await db.bisneysRelationship.create({
      data: {
        sourcePersonId: sug.sourcePersonId, targetPersonId: sug.targetPersonId, relationshipTypeId: fallback.id,
        direction: fallback.symmetric ? "SYMMETRIC" : "DIRECTED", companyId: sug.companyId,
        sourceType: "SUGGESTION", confidenceScore, confirmed: true, addedById: user.id,
      },
    });
  }
  await db.bisneysRelationshipSuggestion.update({ where: { id }, data: { status: "CONFIRMED", resolvedById: user.id, resolvedAt: new Date() } });
  await bisneysAudit({ userId: user.id, action: "suggestion_confirmed", entityType: "relationship_suggestion", entityId: id });
  revalidatePath("/bisneyscrm/relationships");
}

export async function rejectSuggestion(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysRelationshipSuggestion.update({ where: { id }, data: { status: "REJECTED", resolvedById: user.id, resolvedAt: new Date() } });
  await bisneysAudit({ userId: user.id, action: "suggestion_rejected", entityType: "relationship_suggestion", entityId: id });
  revalidatePath("/bisneyscrm/relationships");
}
