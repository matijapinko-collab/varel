"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroAdmin, requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { checkIntLimit } from "@/lib/electro/limits";
import { canManageProjects } from "@/lib/electro/project-access";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroInvestorType } from "@/generated/prisma/client";

/**
 * Investor management (brief §15). Admin (or engineer) only; every row scoped
 * to the authenticated company.
 */

const INVESTORS_PATH = `${ELECTRO_APP_BASE}/investitori`;
const VALID_TYPES = new Set<ElectroInvestorType>([
  "LEGAL_ENTITY",
  "NATURAL_PERSON",
  "PUBLIC_BODY",
  "FUND",
  "GROUP",
]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroInvestorResult = { error?: string; ok?: boolean };

export async function electroCreateInvestor(
  _prev: ElectroInvestorResult,
  form: FormData
): Promise<ElectroInvestorResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za upravljanje investitorima." };

  const name = f(form, "name");
  if (!name) return { error: "Naziv investitora je obavezan." };

  const limit = await checkIntLimit(
    ctx.subscription.planId,
    "maxInvestors",
    await db.electroInvestor.count({ where: { companyId: ctx.company.id, isArchived: false } })
  );
  if (limit) return { error: limit };

  const typeRaw = f(form, "type") as ElectroInvestorType;
  const type = VALID_TYPES.has(typeRaw) ? typeRaw : "LEGAL_ENTITY";

  const investor = await db.electroInvestor.create({
    data: {
      companyId: ctx.company.id,
      type,
      name,
      oib: f(form, "oib") || null,
      address: f(form, "address") || null,
      city: f(form, "city") || null,
      country: f(form, "country") || "Hrvatska",
      email: f(form, "email") || null,
      phone: f(form, "phone") || null,
      notes: f(form, "notes") || null,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "investor_created", entityType: "investor", entityId: investor.id, after: { name } });

  redirect(`${INVESTORS_PATH}/${investor.id}`);
}

export async function electroUpdateInvestor(
  _prev: ElectroInvestorResult,
  form: FormData
): Promise<ElectroInvestorResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast za upravljanje investitorima." };
  const investorId = f(form, "investorId");

  const investor = await db.electroInvestor.findFirst({ where: { id: investorId, companyId: ctx.company.id } });
  if (!investor) return { error: "Investitor nije pronađen." };

  const name = f(form, "name");
  if (!name) return { error: "Naziv investitora je obavezan." };
  const typeRaw = f(form, "type") as ElectroInvestorType;
  const type = VALID_TYPES.has(typeRaw) ? typeRaw : investor.type;

  await db.electroInvestor.update({
    where: { id: investor.id },
    data: {
      type,
      name,
      oib: f(form, "oib") || null,
      address: f(form, "address") || null,
      city: f(form, "city") || null,
      country: f(form, "country") || "Hrvatska",
      email: f(form, "email") || null,
      phone: f(form, "phone") || null,
      notes: f(form, "notes") || null,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "investor_updated", entityType: "investor", entityId: investor.id });

  revalidatePath(`${INVESTORS_PATH}/${investor.id}`);
  return { ok: true };
}

export async function electroArchiveInvestor(
  _prev: ElectroInvestorResult,
  form: FormData
): Promise<ElectroInvestorResult> {
  const ctx = await requireElectroAdmin();
  const investorId = f(form, "investorId");
  const investor = await db.electroInvestor.findFirst({ where: { id: investorId, companyId: ctx.company.id } });
  if (!investor) return { error: "Investitor nije pronađen." };

  await db.electroInvestor.update({ where: { id: investor.id }, data: { isArchived: true } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "investor_archived", entityType: "investor", entityId: investor.id });

  redirect(INVESTORS_PATH);
}

export async function electroAddInvestorContact(
  _prev: ElectroInvestorResult,
  form: FormData
): Promise<ElectroInvestorResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const investorId = f(form, "investorId");
  const investor = await db.electroInvestor.findFirst({ where: { id: investorId, companyId: ctx.company.id } });
  if (!investor) return { error: "Investitor nije pronađen." };

  const firstName = f(form, "firstName");
  const lastName = f(form, "lastName");
  if (!firstName || !lastName) return { error: "Ime i prezime kontakta su obavezni." };

  await db.electroInvestorContact.create({
    data: {
      investorId: investor.id,
      firstName,
      lastName,
      role: f(form, "role") || null,
      email: f(form, "email") || null,
      phone: f(form, "phone") || null,
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "investor_contact_added", entityType: "investor", entityId: investor.id });

  revalidatePath(`${INVESTORS_PATH}/${investor.id}`);
  return { ok: true };
}
