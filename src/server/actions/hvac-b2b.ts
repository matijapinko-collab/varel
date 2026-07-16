"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { requireTenantContext, requireTenantRole, logActivity, MANAGE_ROLES } from "@/lib/hvac/tenant";
import { hashPassword } from "@/lib/hvac/b2b-auth";
import { isValidOib } from "@/lib/hvac/oib";
import { DEFAULT_SERVICES } from "@/lib/hvac/b2b-config";
import { fd, fdBool, fdNum, ActionError } from "./helpers";
import type { HvacRole, HvacEmploymentType } from "@/generated/prisma/client";

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/* ---------------- company ---------------- */

export async function saveCompany(form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const oib = fd(form, "oib");
  if (oib && !isValidOib(oib)) throw new ActionError("OIB nije ispravan.");
  await db.hvacTenant.update({
    where: { id: ctx.tenantId },
    data: {
      name: fd(form, "name") || ctx.tenant.name,
      oib: oib || null,
      legalForm: fd(form, "legalForm") || null,
      address: fd(form, "address") || null,
      city: fd(form, "city") || null,
      postalCode: fd(form, "postalCode") || null,
      phone: fd(form, "phone") || null,
      email: fd(form, "email") || null,
      website: fd(form, "website") || null,
      logoUrl: fd(form, "logoUrl") || null,
      documentFooter: fd(form, "documentFooter") || null,
      vatRegistered: fdBool(form, "vatRegistered"),
    },
  });
  await logActivity(ctx, "company_updated", "tenant", ctx.tenantId);
  revalidatePath("/hvac-b2b/postavke/tvrtka");
}

/* ---------------- services ---------------- */

export async function seedDefaultServices() {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const existing = await db.hvacService.count({ where: { tenantId: ctx.tenantId } });
  if (existing > 0) return;
  await db.hvacService.createMany({
    data: DEFAULT_SERVICES.map((s, i) => ({ tenantId: ctx.tenantId, name: s.name, durationMin: s.durationMin, position: i })),
  });
  await logActivity(ctx, "services_seeded", "service");
  revalidatePath("/hvac-b2b/onboarding");
  revalidatePath("/hvac-b2b/postavke/usluge");
}

export async function createService(form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const name = fd(form, "name");
  if (!name) throw new ActionError("Naziv usluge je obavezan.");
  const count = await db.hvacService.count({ where: { tenantId: ctx.tenantId } });
  await db.hvacService.create({
    data: {
      tenantId: ctx.tenantId, name,
      description: fd(form, "description") || null,
      durationMin: fdNum(form, "durationMin") ?? 60,
      defaultPriceEur: fdNum(form, "defaultPriceEur"),
      bookingVisible: fdBool(form, "bookingVisible"),
      manualConfirm: fdBool(form, "manualConfirm"),
      position: count,
    },
  });
  await logActivity(ctx, "service_created", "service");
  revalidatePath("/hvac-b2b/onboarding");
  revalidatePath("/hvac-b2b/postavke/usluge");
}

export async function updateService(id: string, form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  await db.hvacService.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      name: fd(form, "name"),
      description: fd(form, "description") || null,
      durationMin: fdNum(form, "durationMin") ?? 60,
      defaultPriceEur: fdNum(form, "defaultPriceEur"),
      bookingVisible: fdBool(form, "bookingVisible"),
      manualConfirm: fdBool(form, "manualConfirm"),
    },
  });
  revalidatePath("/hvac-b2b/postavke/usluge");
}

export async function toggleService(id: string) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const s = await db.hvacService.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!s) return;
  await db.hvacService.update({ where: { id }, data: { isActive: !s.isActive } });
  revalidatePath("/hvac-b2b/postavke/usluge");
}

/* ---------------- technicians ---------------- */

export async function createTechnician(form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const name = fd(form, "name");
  if (!name) throw new ActionError("Ime majstora je obavezno.");
  await db.hvacTechnician.create({
    data: {
      tenantId: ctx.tenantId, name,
      phone: fd(form, "phone") || null,
      email: fd(form, "email") || null,
      specialization: fd(form, "specialization") || null,
      serviceArea: fd(form, "serviceArea") || null,
      employmentType: (fd(form, "employmentType") || "EMPLOYEE") as HvacEmploymentType,
      calendarColor: fd(form, "calendarColor") || "#0ea5e9",
      notes: fd(form, "notes") || null,
      isActive: true,
    },
  });
  await logActivity(ctx, "technician_created", "technician");
  revalidatePath("/hvac-b2b/onboarding");
  revalidatePath("/hvac-b2b/majstori");
}

export async function updateTechnician(id: string, form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  await db.hvacTechnician.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      name: fd(form, "name"),
      phone: fd(form, "phone") || null,
      email: fd(form, "email") || null,
      specialization: fd(form, "specialization") || null,
      serviceArea: fd(form, "serviceArea") || null,
      employmentType: (fd(form, "employmentType") || "EMPLOYEE") as HvacEmploymentType,
      calendarColor: fd(form, "calendarColor") || "#0ea5e9",
      notes: fd(form, "notes") || null,
    },
  });
  revalidatePath("/hvac-b2b/majstori");
}

export async function toggleTechnician(id: string) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const tech = await db.hvacTechnician.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!tech) return;
  await db.hvacTechnician.update({ where: { id }, data: { isActive: !tech.isActive } });
  await logActivity(ctx, tech.isActive ? "technician_deactivated" : "technician_activated", "technician", id);
  revalidatePath("/hvac-b2b/majstori");
}

/* ---------------- working hours ---------------- */

export async function saveWorkingHours(form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const days = Object.fromEntries(
    WEEK.map((d) => [d, { enabled: fdBool(form, `${d}_enabled`), start: fd(form, `${d}_start`) || "08:00", end: fd(form, `${d}_end`) || "16:00" }]),
  );
  await db.hvacTenantSettings.upsert({
    where: { tenantId: ctx.tenantId },
    create: { tenantId: ctx.tenantId, workingHoursJson: days },
    update: { workingHoursJson: days },
  });
  await logActivity(ctx, "working_hours_saved");
  revalidatePath("/hvac-b2b/onboarding");
  revalidatePath("/hvac-b2b/postavke/tvrtka");
}

/* ---------------- booking settings ---------------- */

export async function saveBookingSettings(form: FormData) {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  await db.hvacBookingSettings.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      enabled: fdBool(form, "enabled"),
      autoConfirm: fdBool(form, "autoConfirm"),
      minNoticeHours: fdNum(form, "minNoticeHours") ?? 24,
      horizonDays: fdNum(form, "horizonDays") ?? 60,
      bufferMin: fdNum(form, "bufferMin") ?? 15,
      serviceArea: fd(form, "serviceArea") || null,
      publicPhone: fd(form, "publicPhone") || null,
      publicEmail: fd(form, "publicEmail") || null,
    },
    update: {
      enabled: fdBool(form, "enabled"),
      autoConfirm: fdBool(form, "autoConfirm"),
      minNoticeHours: fdNum(form, "minNoticeHours") ?? 24,
      horizonDays: fdNum(form, "horizonDays") ?? 60,
      bufferMin: fdNum(form, "bufferMin") ?? 15,
      serviceArea: fd(form, "serviceArea") || null,
      publicPhone: fd(form, "publicPhone") || null,
      publicEmail: fd(form, "publicEmail") || null,
    },
  });
  await logActivity(ctx, "booking_settings_saved");
  revalidatePath("/hvac-b2b/onboarding");
  revalidatePath("/hvac-b2b/postavke/booking");
}

/* ---------------- users / team ---------------- */

export async function inviteUser(form: FormData) {
  const ctx = await requireTenantRole(["OWNER"]);
  const email = fd(form, "email").toLowerCase();
  const name = fd(form, "name");
  const role = (fd(form, "role") || "TECHNICIAN") as HvacRole;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError("Unesite ime i ispravan e-mail.");

  let user = await db.hvacUser.findUnique({ where: { email } });
  const resetToken = randomBytes(24).toString("hex");
  if (!user) {
    user = await db.hvacUser.create({
      data: { email, name, passwordHash: await hashPassword(randomBytes(16).toString("hex")), resetToken, resetTokenExpires: new Date(Date.now() + 7 * 86_400_000) },
    });
  }
  const existingMembership = await db.hvacTenantUser.findFirst({ where: { tenantId: ctx.tenantId, userId: user.id } });
  if (existingMembership) throw new ActionError("Korisnik je već član tvrtke.");
  await db.hvacTenantUser.create({ data: { tenantId: ctx.tenantId, userId: user.id, role } });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";
  const url = `${site}/hvac-b2b/reset-lozinke?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: `Pozvani ste u ${ctx.tenant.name} — Varel HVAC`,
    text: `Pozdrav ${name},\n\nDodani ste u tvrtku ${ctx.tenant.name} na Varel HVAC-u.\nPostavite lozinku i prijavite se:\n${url}`,
  }).catch(() => {});
  await logActivity(ctx, "user_invited", "user", user.id, { role });
  revalidatePath("/hvac-b2b/postavke/korisnici");
}

export async function changeUserRole(membershipId: string, form: FormData) {
  const ctx = await requireTenantRole(["OWNER"]);
  const role = fd(form, "role") as HvacRole;
  const m = await db.hvacTenantUser.findFirst({ where: { id: membershipId, tenantId: ctx.tenantId } });
  if (!m || m.role === "OWNER") return;
  await db.hvacTenantUser.update({ where: { id: membershipId }, data: { role } });
  await logActivity(ctx, "user_role_changed", "user", m.userId, { role });
  revalidatePath("/hvac-b2b/postavke/korisnici");
}

export async function toggleUserActive(membershipId: string) {
  const ctx = await requireTenantRole(["OWNER"]);
  const m = await db.hvacTenantUser.findFirst({ where: { id: membershipId, tenantId: ctx.tenantId } });
  if (!m || m.role === "OWNER") return;
  await db.hvacTenantUser.update({ where: { id: membershipId }, data: { isActive: !m.isActive } });
  revalidatePath("/hvac-b2b/postavke/korisnici");
}
