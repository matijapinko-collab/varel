"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, boolOf } from "@/lib/bisneyscrm/forms";

export type SaveResult = { error?: string };

export async function savePerson(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const id = opt(form.get("id"));
  const firstName = opt(form.get("firstName"));
  const lastName = opt(form.get("lastName"));
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!fullName) return { error: "Ime i prezime su obavezni." };

  const data = {
    firstName, lastName, fullName,
    email: opt(form.get("email")),
    phone: opt(form.get("phone")),
    city: opt(form.get("city")),
    country: opt(form.get("country")),
    notes: opt(form.get("notes")),
    source: opt(form.get("source")),
  };

  let personId: string;
  if (id) {
    await db.bisneysPerson.update({ where: { id }, data });
    personId = id;
    await bisneysAudit({ userId: user.id, action: "person_updated", entityType: "person", entityId: personId, after: { fullName } });
  } else {
    const created = await db.bisneysPerson.create({ data: { ...data, createdById: user.id } });
    personId = created.id;
    await bisneysAudit({ userId: user.id, action: "person_created", entityType: "person", entityId: personId, after: { fullName } });
  }
  redirect(`/bisneyscrm/people/${personId}`);
}

export async function archivePerson(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysPerson.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } });
  await bisneysAudit({ userId: user.id, action: "person_archived", entityType: "person", entityId: id });
  redirect("/bisneyscrm/people");
}

/** Create a contact = a Person linked to a Company (brief §13/§29). */
export async function createContact(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const companyId = str(form.get("companyId"));
  const firstName = opt(form.get("firstName"));
  const lastName = opt(form.get("lastName"));
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!companyId || !fullName) redirect("/bisneyscrm/contacts");

  const person = await db.bisneysPerson.create({
    data: { firstName, lastName, fullName, email: opt(form.get("email")), phone: opt(form.get("phone")), createdById: user.id },
  });
  await db.bisneysContact.create({
    data: { companyId, personId: person.id, title: opt(form.get("title")), email: opt(form.get("email")), phone: opt(form.get("phone")), isPrimary: boolOf(form.get("isPrimary")) },
  });
  await db.bisneysActivity.create({
    data: { type: "CONTACT_ADDED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "COMPANY", entityId: companyId, companyId, personId: person.id, newValue: fullName },
  });
  await bisneysAudit({ userId: user.id, action: "contact_created", entityType: "contact", entityId: person.id, after: { companyId } });
  redirect(`/bisneyscrm/companies/${companyId}`);
}
