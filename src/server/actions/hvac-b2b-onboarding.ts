"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity } from "@/lib/hvac/tenant";
import { isValidOib } from "@/lib/hvac/oib";
import { fd, fdBool } from "./helpers";

const ONB = "/hvac-b2b/onboarding";
const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Records the furthest reached step (never goes backwards). */
async function advance(tenantId: string, reachedStep: number, current: number) {
  await db.hvacTenant.update({ where: { id: tenantId }, data: { onboardingStep: Math.max(current, reachedStep) } });
}

export async function onbCompany(form: FormData) {
  const ctx = await requireTenantContext();
  const oib = fd(form, "oib");
  await db.hvacTenant.update({
    where: { id: ctx.tenantId },
    data: {
      name: fd(form, "name") || ctx.tenant.name,
      oib: oib && isValidOib(oib) ? oib : ctx.tenant.oib,
      legalForm: fd(form, "legalForm") || null,
      address: fd(form, "address") || null,
      city: fd(form, "city") || null,
      postalCode: fd(form, "postalCode") || null,
      phone: fd(form, "phone") || null,
      email: fd(form, "email") || ctx.tenant.email,
      website: fd(form, "website") || null,
      documentFooter: fd(form, "documentFooter") || null,
      vatRegistered: fdBool(form, "vatRegistered"),
    },
  });
  await advance(ctx.tenantId, 1, ctx.tenant.onboardingStep);
  redirect(`${ONB}?step=2`);
}

export async function onbHours(form: FormData) {
  const ctx = await requireTenantContext();
  const days = Object.fromEntries(
    WEEK.map((d) => [d, { enabled: fdBool(form, `${d}_enabled`), start: fd(form, `${d}_start`) || "08:00", end: fd(form, `${d}_end`) || "16:00" }]),
  );
  await db.hvacTenantSettings.upsert({
    where: { tenantId: ctx.tenantId },
    create: { tenantId: ctx.tenantId, workingHoursJson: days },
    update: { workingHoursJson: days },
  });
  await advance(ctx.tenantId, 3, ctx.tenant.onboardingStep);
  redirect(`${ONB}?step=4`);
}

export async function onbBooking(form: FormData) {
  const ctx = await requireTenantContext();
  await db.hvacBookingSettings.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId, enabled: fdBool(form, "enabled"), autoConfirm: false,
      serviceArea: fd(form, "serviceArea") || null, publicPhone: fd(form, "publicPhone") || null, publicEmail: fd(form, "publicEmail") || null,
    },
    update: {
      enabled: fdBool(form, "enabled"),
      serviceArea: fd(form, "serviceArea") || null, publicPhone: fd(form, "publicPhone") || null, publicEmail: fd(form, "publicEmail") || null,
    },
  });
  await advance(ctx.tenantId, 5, ctx.tenant.onboardingStep);
  redirect(`${ONB}?step=6`);
}

/** For steps whose data is saved by their own CRUD (services, technicians, import). */
export async function onbStep(fromStep: number) {
  const ctx = await requireTenantContext();
  await advance(ctx.tenantId, fromStep, ctx.tenant.onboardingStep);
  redirect(`${ONB}?step=${fromStep + 1}`);
}

export async function onbComplete() {
  const ctx = await requireTenantContext();
  await db.hvacTenant.update({ where: { id: ctx.tenantId }, data: { onboardingStep: 7, onboardingCompleted: true } });
  await logActivity(ctx, "onboarding_completed", "tenant", ctx.tenantId);
  redirect("/hvac-b2b/nadzorna-ploca");
}
