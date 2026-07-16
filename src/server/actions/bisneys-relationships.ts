"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser, requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, boolOf } from "@/lib/bisneyscrm/forms";

export type SaveResult = { error?: string };

/** Add a directed/symmetric relationship; referral types also create a Referral. */
export async function addRelationship(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const sourcePersonId = str(form.get("sourcePersonId"));
  const targetPersonId = str(form.get("targetPersonId"));
  const relationshipTypeId = str(form.get("relationshipTypeId"));
  if (!sourcePersonId || !targetPersonId || !relationshipTypeId) return { error: "Odaberite obje osobe i vrstu odnosa." };
  if (sourcePersonId === targetPersonId) return { error: "Osoba ne može biti povezana sama sa sobom." };

  const type = await db.bisneysRelationshipType.findUnique({ where: { id: relationshipTypeId } });
  if (!type) return { error: "Vrsta odnosa nije pronađena." };

  const companyId = opt(form.get("companyId"));
  const rel = await db.bisneysRelationship.create({
    data: {
      sourcePersonId, targetPersonId, relationshipTypeId,
      direction: type.symmetric ? "SYMMETRIC" : "DIRECTED",
      companyId, note: opt(form.get("note")), infoSource: opt(form.get("infoSource")),
      confirmed: boolOf(form.get("confirmed")), addedById: user.id,
    },
  });

  // Referral relationships also feed the referral statistics (brief §47).
  if (type.category === "referral") {
    await db.bisneysReferral.create({ data: { referrerPersonId: sourcePersonId, referredPersonId: targetPersonId, companyId, createdById: user.id } });
  }

  await db.bisneysActivity.create({
    data: { type: "RELATIONSHIP_ADDED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "PERSON", entityId: sourcePersonId, personId: sourcePersonId, newValue: type.name },
  });
  await bisneysAudit({ userId: user.id, action: "relationship_added", entityType: "relationship", entityId: rel.id, after: { type: type.name, targetPersonId } });

  redirect(`/bisneyscrm/people/${sourcePersonId}`);
}

export async function removeRelationship(id: string, backPersonId: string): Promise<void> {
  const user = await requireBisneysUser();
  const rel = await db.bisneysRelationship.findUnique({ where: { id } });
  if (rel) {
    await db.bisneysRelationship.delete({ where: { id } });
    await db.bisneysActivity.create({
      data: { type: "RELATIONSHIP_REMOVED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "PERSON", entityId: rel.sourcePersonId, personId: rel.sourcePersonId },
    });
    await bisneysAudit({ userId: user.id, action: "relationship_removed", entityType: "relationship", entityId: id });
  }
  redirect(`/bisneyscrm/people/${backPersonId}`);
}

/** Superadmin: add a custom relationship type (brief §43). */
export async function createRelationshipType(form: FormData): Promise<void> {
  await requireBisneysSuperadmin();
  const name = str(form.get("name"));
  if (name) {
    const exists = await db.bisneysRelationshipType.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!exists) {
      await db.bisneysRelationshipType.create({
        data: { name, category: opt(form.get("category")) ?? "business", symmetric: boolOf(form.get("symmetric")) },
      });
    }
  }
  redirect("/bisneyscrm/relationships");
}
