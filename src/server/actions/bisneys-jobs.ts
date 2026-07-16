"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, intOrNull, dateOrNull } from "@/lib/bisneyscrm/forms";

export type SaveResult = { error?: string };

/**
 * Resolves a free-typed profession name to a normalized Profession (brief §39):
 * matches an existing alias, then an existing profession name, otherwise creates
 * a new profession. Prevents "Serviser klima" / "HVAC serviser" fragmenting.
 */
async function resolveProfessionId(name: string | null): Promise<string | null> {
  if (!name) return null;
  const alias = await db.bisneysProfessionAlias.findFirst({
    where: { alias: { equals: name, mode: "insensitive" } }, select: { professionId: true },
  });
  if (alias) return alias.professionId;
  const existing = await db.bisneysProfession.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }, select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.bisneysProfession.create({ data: { name } });
  return created.id;
}

export async function saveJob(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const id = opt(form.get("id"));
  const title = str(form.get("title"));
  if (!title) return { error: "Naziv radnog mjesta je obavezan." };

  const professionId = await resolveProfessionId(opt(form.get("professionName")));
  const data = {
    title,
    professionId,
    companyId: opt(form.get("companyId")),
    location: opt(form.get("location")),
    headcount: intOrNull(form.get("headcount")),
    salary: opt(form.get("salary")),
    currency: opt(form.get("currency")) ?? "EUR",
    contractType: opt(form.get("contractType")),
    startDate: dateOrNull(form.get("startDate")),
    status: opt(form.get("status")),
    description: opt(form.get("description")),
    requirements: opt(form.get("requirements")),
    languages: opt(form.get("languages")),
    licenses: opt(form.get("licenses")),
  };

  let jobId: string;
  if (id) {
    await db.bisneysJob.update({ where: { id }, data });
    jobId = id;
    await bisneysAudit({ userId: user.id, action: "job_updated", entityType: "job", entityId: jobId, after: { title } });
  } else {
    const created = await db.bisneysJob.create({ data });
    jobId = created.id;
    await bisneysAudit({ userId: user.id, action: "job_created", entityType: "job", entityId: jobId, after: { title } });
  }
  redirect(`/bisneyscrm/jobs/${jobId}`);
}

export async function archiveJob(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysJob.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } });
  await bisneysAudit({ userId: user.id, action: "job_archived", entityType: "job", entityId: id });
  redirect("/bisneyscrm/jobs");
}

/* --- profession normalization management (brief §39) --- */

export async function createProfession(form: FormData): Promise<void> {
  await requireBisneysUser();
  const name = str(form.get("name"));
  if (name) {
    const exists = await db.bisneysProfession.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!exists) await db.bisneysProfession.create({ data: { name } });
  }
  redirect("/bisneyscrm/jobs/profesije");
}

export async function addProfessionAlias(form: FormData): Promise<void> {
  await requireBisneysUser();
  const professionId = str(form.get("professionId"));
  const alias = str(form.get("alias"));
  if (professionId && alias) {
    const exists = await db.bisneysProfessionAlias.findFirst({ where: { alias: { equals: alias, mode: "insensitive" } } });
    if (!exists) await db.bisneysProfessionAlias.create({ data: { professionId, alias } });
  }
  redirect("/bisneyscrm/jobs/profesije");
}
