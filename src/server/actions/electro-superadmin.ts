"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { requireElectroSuperadmin } from "@/lib/electro/auth/guard";
import { ELECTRO_BASE, ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/constants";
import { createElectroInvite } from "@/lib/electro/invites";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Superadministration actions (brief §5, §8): manual approval workflow, trial
 * control, suspension, plan changes. Every action re-verifies the global
 * superadmin session — these are the highest-privilege operations in the
 * module.
 */

export type ElectroSaActionResult = { error?: string; ok?: boolean };

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refresh(): void {
  revalidatePath(ELECTRO_SUPERADMIN_BASE);
}

async function loadSubscription(companyId: string) {
  return db.electroCompanySubscription.findUnique({
    where: { companyId },
    include: { company: true, plan: true },
  });
}

/** Approve a PENDING_APPROVAL company: start the trial, invite the first admin. */
export async function electroApproveCompany(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  if (sub.status !== "PENDING_APPROVAL") return { error: "Tvrtka nije u statusu čekanja odobrenja." };

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + sub.plan.trialDays * 24 * 60 * 60 * 1000);
  await db.electroCompanySubscription.update({
    where: { id: sub.id },
    data: {
      status: "TRIAL",
      approvedAt: now,
      approvedById: sa.id,
      trialStartsAt: now,
      trialEndsAt,
    },
  });

  // The first admin (created INVITED at registration) gets the password link.
  const admin = await db.electroUser.findFirst({
    where: { companyId, status: "INVITED", roles: { some: { role: { key: "ADMIN" } } } },
    orderBy: { createdAt: "asc" },
  });
  if (admin) {
    const { rawToken, expiresAt } = await createElectroInvite({
      userId: admin.id,
      companyId,
      invitedBySuperadminId: sa.id,
    });
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const link = `${site}${ELECTRO_BASE}/postavi-lozinku/${rawToken}`;
    if (isEmailConfigured()) {
      await sendEmail({
        to: admin.email,
        subject: "Varel Electric — vaš pristup je odobren",
        text: `Poštovani ${admin.firstName},\n\ntvrtka "${sub.company.name}" odobrena je za Varel Electric i probno razdoblje od ${sub.plan.trialDays} dana je počelo.\n\nPostavite svoju lozinku putem poveznice (vrijedi do ${expiresAt.toLocaleDateString("hr-HR")}):\n${link}\n\nVarel tim`,
      });
    } else {
      // Dev fallback: without email config the link must still be reachable.
      console.info(`[electro] invite link for ${admin.email}: ${link}`);
    }
  }

  await electroAudit({
    companyId,
    superadminId: sa.id,
    action: "company_approved",
    entityType: "company",
    entityId: companyId,
    after: { trialEndsAt: trialEndsAt.toISOString(), plan: sub.plan.key },
  });
  refresh();
  return { ok: true };
}

export async function electroRejectCompany(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");
  const reason = f(form, "reason");
  if (!reason) return { error: "Unesite razlog odbijanja." };

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  if (sub.status !== "PENDING_APPROVAL") return { error: "Tvrtka nije u statusu čekanja odobrenja." };

  await db.electroCompanySubscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", rejectedAt: new Date(), rejectionReason: reason },
  });
  await electroAudit({ companyId, superadminId: sa.id, action: "company_rejected", entityType: "company", entityId: companyId, after: { reason } });
  refresh();
  return { ok: true };
}

export async function electroSuspendCompany(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");
  const reason = f(form, "reason");
  if (!reason) return { error: "Unesite razlog suspenzije." };

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  if (sub.status !== "TRIAL" && sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") {
    return { error: "Samo aktivnu tvrtku ili tvrtku u trialu moguće je suspendirati." };
  }

  await db.electroCompanySubscription.update({
    where: { id: sub.id },
    data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: reason },
  });
  await electroAudit({ companyId, superadminId: sa.id, action: "company_suspended", entityType: "company", entityId: companyId, after: { reason } });
  refresh();
  return { ok: true };
}

/** Reactivate a suspended company: back to TRIAL if it still has trial days, else ACTIVE. */
export async function electroReactivateCompany(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  if (sub.status !== "SUSPENDED" && sub.status !== "EXPIRED") {
    return { error: "Tvrtka nije suspendirana ni istekla." };
  }

  const backToTrial = sub.trialEndsAt !== null && sub.trialEndsAt.getTime() > Date.now();
  await db.electroCompanySubscription.update({
    where: { id: sub.id },
    data: { status: backToTrial ? "TRIAL" : "ACTIVE", suspendedAt: null, suspensionReason: null },
  });
  await electroAudit({ companyId, superadminId: sa.id, action: "company_reactivated", entityType: "company", entityId: companyId, after: { status: backToTrial ? "TRIAL" : "ACTIVE" } });
  refresh();
  return { ok: true };
}

export async function electroExtendTrial(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");
  const days = Number.parseInt(f(form, "days"), 10);
  if (!Number.isFinite(days) || days < 1 || days > 90) return { error: "Broj dana mora biti između 1 i 90." };

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  if (sub.status !== "TRIAL" && sub.status !== "EXPIRED") return { error: "Trial je moguće produžiti samo tvrtki u trialu ili s isteklim trialom." };

  const base = sub.trialEndsAt && sub.trialEndsAt.getTime() > Date.now() ? sub.trialEndsAt : new Date();
  const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await db.electroCompanySubscription.update({
    where: { id: sub.id },
    data: { status: "TRIAL", trialEndsAt },
  });
  await electroAudit({ companyId, superadminId: sa.id, action: "trial_extended", entityType: "company", entityId: companyId, after: { days, trialEndsAt: trialEndsAt.toISOString() } });
  refresh();
  return { ok: true };
}

export async function electroChangeCompanyPlan(
  _prev: ElectroSaActionResult,
  form: FormData
): Promise<ElectroSaActionResult> {
  const sa = await requireElectroSuperadmin();
  const companyId = f(form, "companyId");
  const planKey = f(form, "planKey");

  const sub = await loadSubscription(companyId);
  if (!sub) return { error: "Tvrtka nije pronađena." };
  const plan = await db.electroSubscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan || !plan.isActive) return { error: "Odabrani paket ne postoji." };

  await db.electroCompanySubscription.update({ where: { id: sub.id }, data: { planId: plan.id } });
  await electroAudit({
    companyId,
    superadminId: sa.id,
    action: "plan_changed",
    entityType: "company",
    entityId: companyId,
    before: { plan: sub.plan.key },
    after: { plan: plan.key },
  });
  refresh();
  return { ok: true };
}
