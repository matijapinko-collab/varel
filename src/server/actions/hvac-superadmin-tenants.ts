"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperadmin, auditSuperadmin, SA_BASE } from "@/lib/hvac/superadmin";
import { PLAN_CONFIG } from "@/lib/hvac/b2b-config";
import { fd, ActionError } from "./helpers";
import type { HvacTenantStatus, HvacPlan } from "@/generated/prisma/client";

const VALID_STATUS: HvacTenantStatus[] = ["TRIAL", "PENDING_ACTIVATION", "ACTIVE", "OVERDUE", "SUSPENDED", "CANCELLED"];

/** Superadmin: change a tenant's lifecycle status (e.g. suspend / reactivate). */
export async function setTenantStatus(tenantId: string, form: FormData) {
  const sa = await requireSuperadmin();
  const status = fd(form, "status") as HvacTenantStatus;
  if (!VALID_STATUS.includes(status)) throw new ActionError("Nevažeći status.");
  const tenant = await db.hvacTenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
  if (!tenant) throw new ActionError("Tvrtka nije pronađena.");

  await db.hvacTenant.update({ where: { id: tenantId }, data: { status } });
  await db.hvacSubscription.updateMany({ where: { tenantId }, data: { status } });
  await auditSuperadmin("tenant_status_changed", sa.id, { tenantId, from: tenant.status, to: status });
  revalidatePath(`${SA_BASE}/tvrtke/${tenantId}`);
  revalidatePath(SA_BASE);
}

/** Superadmin: move a tenant to a different plan (updates price + included seats). */
export async function setTenantPlan(tenantId: string, form: FormData) {
  const sa = await requireSuperadmin();
  const plan = fd(form, "plan") as HvacPlan;
  const cfg = PLAN_CONFIG[plan];
  if (!cfg) throw new ActionError("Nevažeći paket.");
  const tenant = await db.hvacTenant.findUnique({ where: { id: tenantId }, select: { id: true, plan: true } });
  if (!tenant) throw new ActionError("Tvrtka nije pronađena.");

  await db.hvacTenant.update({ where: { id: tenantId }, data: { plan } });
  await db.hvacSubscription.updateMany({
    where: { tenantId },
    data: { plan, monthlyPriceEur: cfg.monthlyPriceEur, includedUsers: cfg.includedUsers },
  });
  await auditSuperadmin("tenant_plan_changed", sa.id, { tenantId, from: tenant.plan, to: plan });
  revalidatePath(`${SA_BASE}/tvrtke/${tenantId}`);
  revalidatePath(SA_BASE);
}

/** Superadmin: save free-text billing notes on the subscription. */
export async function saveTenantBillingNotes(tenantId: string, form: FormData) {
  const sa = await requireSuperadmin();
  await db.hvacSubscription.updateMany({ where: { tenantId }, data: { billingNotes: fd(form, "billingNotes") || null } });
  await auditSuperadmin("tenant_billing_notes", sa.id, { tenantId });
  revalidatePath(`${SA_BASE}/tvrtke/${tenantId}`);
}
