"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { checkIntLimit } from "@/lib/electro/limits";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Company profile, branches and departments (brief §6, §9). Admin-only; every
 * row is scoped to the authenticated company. Branches/departments are
 * soft-deactivated, never hard-deleted (brief §61).
 */

const SETTINGS_PATH = `${ELECTRO_APP_BASE}/postavke`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroCompanyResult = { error?: string; ok?: boolean };

export async function electroUpdateCompanyProfile(
  _prev: ElectroCompanyResult,
  form: FormData
): Promise<ElectroCompanyResult> {
  const ctx = await requireElectroAdmin();

  const name = f(form, "name");
  if (!name) return { error: "Naziv tvrtke je obavezan." };

  await db.electroCompany.update({
    where: { id: ctx.company.id },
    data: {
      name,
      oib: f(form, "oib") || null,
      address: f(form, "address") || null,
      city: f(form, "city") || null,
      contactEmail: f(form, "contactEmail") || null,
      contactPhone: f(form, "contactPhone") || null,
    },
  });
  await electroAudit({
    companyId: ctx.company.id,
    userId: ctx.user.id,
    action: "company_profile_updated",
    entityType: "company",
    entityId: ctx.company.id,
    before: { name: ctx.company.name },
    after: { name },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function electroCreateBranch(
  _prev: ElectroCompanyResult,
  form: FormData
): Promise<ElectroCompanyResult> {
  const ctx = await requireElectroAdmin();
  const name = f(form, "name");
  if (!name) return { error: "Naziv podružnice je obavezan." };

  const active = await db.electroBranch.count({ where: { companyId: ctx.company.id, isActive: true } });
  const limit = await checkIntLimit(ctx.subscription.planId, "maxBranches", active);
  if (limit) return { error: limit };

  const branch = await db.electroBranch.create({
    data: { companyId: ctx.company.id, name, city: f(form, "city") || null, address: f(form, "address") || null },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "branch_created", entityType: "branch", entityId: branch.id, after: { name } });

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function electroUpdateBranch(
  _prev: ElectroCompanyResult,
  form: FormData
): Promise<ElectroCompanyResult> {
  const ctx = await requireElectroAdmin();
  const branchId = f(form, "branchId");
  const branch = await db.electroBranch.findFirst({ where: { id: branchId, companyId: ctx.company.id } });
  if (!branch) return { error: "Podružnica nije pronađena." };

  const deactivate = f(form, "deactivate") === "true";
  if (deactivate) {
    await db.electroBranch.update({ where: { id: branch.id }, data: { isActive: false } });
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "branch_deactivated", entityType: "branch", entityId: branch.id });
  } else {
    const name = f(form, "name");
    if (!name) return { error: "Naziv podružnice je obavezan." };
    await db.electroBranch.update({
      where: { id: branch.id },
      data: { name, city: f(form, "city") || null, address: f(form, "address") || null, isActive: true },
    });
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "branch_updated", entityType: "branch", entityId: branch.id, before: { name: branch.name }, after: { name } });
  }

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function electroCreateDepartment(
  _prev: ElectroCompanyResult,
  form: FormData
): Promise<ElectroCompanyResult> {
  const ctx = await requireElectroAdmin();
  const name = f(form, "name");
  if (!name) return { error: "Naziv odjela je obavezan." };

  const dep = await db.electroDepartment.create({ data: { companyId: ctx.company.id, name } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "department_created", entityType: "department", entityId: dep.id, after: { name } });

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function electroUpdateDepartment(
  _prev: ElectroCompanyResult,
  form: FormData
): Promise<ElectroCompanyResult> {
  const ctx = await requireElectroAdmin();
  const departmentId = f(form, "departmentId");
  const dep = await db.electroDepartment.findFirst({ where: { id: departmentId, companyId: ctx.company.id } });
  if (!dep) return { error: "Odjel nije pronađen." };

  const deactivate = f(form, "deactivate") === "true";
  if (deactivate) {
    await db.electroDepartment.update({ where: { id: dep.id }, data: { isActive: false } });
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "department_deactivated", entityType: "department", entityId: dep.id });
  } else {
    const name = f(form, "name");
    if (!name) return { error: "Naziv odjela je obavezan." };
    await db.electroDepartment.update({ where: { id: dep.id }, data: { name, isActive: true } });
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "department_updated", entityType: "department", entityId: dep.id, before: { name: dep.name }, after: { name } });
  }

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}
