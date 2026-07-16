"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import { sendEmail, adminNotifyEmail } from "@/lib/email";
import { slugify } from "./helpers";
import { hashPassword, verifyPassword, setHvacSession, clearHvacSession, isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { isValidOib } from "@/lib/hvac/oib";
import { PLAN_CONFIG } from "@/lib/hvac/b2b-config";
import { HVAC_ROUTES } from "@/lib/hvac/content";
import type { HvacPlan, HvacContractTerm } from "@/generated/prisma/client";

function fd(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function site(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://varel.io";
}
function token(): string {
  return randomBytes(24).toString("hex");
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "servis";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const exists = await db.hvacTenant.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${token().slice(0, 6)}`;
}

export type RegisterResult = { error?: string };

export async function registerCompany(_prev: RegisterResult, form: FormData): Promise<RegisterResult> {
  if (!isHvacB2bEnabled()) return { error: "Registracija još nije otvorena." };

  const ownerName = fd(form, "ownerName");
  const email = fd(form, "email").toLowerCase();
  const phone = fd(form, "phone");
  const company = fd(form, "company");
  const oib = fd(form, "oib");
  const legalForm = fd(form, "legalForm");
  const address = fd(form, "address");
  const city = fd(form, "city");
  const postalCode = fd(form, "postalCode");
  const password = String(form.get("password") ?? "");
  const plan = (fd(form, "plan") || "START") as HvacPlan;
  // Packages are monthly with no long-term contract.
  const term: HvacContractTerm = "MONTHLY";
  const consent = form.get("consent") === "on" || form.get("consent") === "true";
  const privacy = form.get("privacy") === "on" || form.get("privacy") === "true";

  if (!ownerName || !company) return { error: "Unesite ime i naziv tvrtke." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Unesite ispravnu poslovnu e-mail adresu." };
  if (oib && !isValidOib(oib)) return { error: "OIB nije ispravan." };
  if (password.length < 10) return { error: "Lozinka mora imati najmanje 10 znakova." };
  if (!consent || !privacy) return { error: "Morate prihvatiti uvjete i pravila privatnosti." };
  if (!PLAN_CONFIG[plan]) return { error: "Nepoznat paket." };

  const existing = await db.hvacUser.findUnique({ where: { email } });
  if (existing) return { error: "Korisnik s ovom e-mail adresom već postoji." };

  const cfg = PLAN_CONFIG[plan];
  const verifyToken = token();
  const slug = await uniqueSlug(company);

  const { user, tenant } = await db.$transaction(async (tx) => {
    const user = await tx.hvacUser.create({
      data: { email, passwordHash: await hashPassword(password), name: ownerName, phone: phone || null, verifyToken },
    });
    const tenant = await tx.hvacTenant.create({
      data: {
        name: company, slug, oib: oib || null, legalForm: legalForm || null,
        address: address || null, city: city || null, postalCode: postalCode || null,
        phone: phone || null, email, plan, status: "TRIAL",
      },
    });
    await tx.hvacTenantSettings.create({ data: { tenantId: tenant.id } });
    await tx.hvacBookingSettings.create({ data: { tenantId: tenant.id, publicEmail: email, publicPhone: phone || null } });
    await tx.hvacSubscription.create({
      data: {
        tenantId: tenant.id, plan, term,
        monthlyPriceEur: cfg.monthlyPriceEur, includedUsers: cfg.includedUsers,
        status: "TRIAL", trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
      },
    });
    await tx.hvacTenantUser.create({ data: { tenantId: tenant.id, userId: user.id, role: "OWNER" } });
    return { user, tenant };
  });

  await setHvacSession({ uid: user.id, tid: tenant.id, role: "OWNER" });

  // Verification + admin notification (graceful).
  const verifyUrl = `${site()}/api/hvac-b2b/verify?token=${verifyToken}`;
  await sendEmail({
    to: email,
    subject: "Potvrdite svoju Varel HVAC e-mail adresu",
    text: `Pozdrav ${ownerName},\n\nHvala na registraciji za Varel HVAC.\nPotvrdite svoju e-mail adresu klikom na poveznicu:\n${verifyUrl}\n\nAko niste vi izradili račun, zanemarite ovu poruku.`,
  }).catch(() => {});
  await sendEmail({
    to: adminNotifyEmail(),
    subject: `Varel HVAC — nova registracija tvrtke: ${company}`,
    text: `Nova Varel HVAC tvrtka:\n\nTvrtka: ${company}\nOIB: ${oib || "—"}\nVlasnik: ${ownerName}\nE-mail: ${email}\nTelefon: ${phone || "—"}\nPaket: ${plan} / ${term}`,
  }).catch(() => {});

  redirect(`${HVAC_ROUTES.login}/onboarding`);
}

export type LoginResult = { error?: string };

export async function loginHvac(_prev: LoginResult, form: FormData): Promise<LoginResult> {
  if (!isHvacB2bEnabled()) return { error: "Prijava još nije otvorena." };

  const email = fd(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Unesite e-mail i lozinku." };

  if (await isLoginRateLimited(email)) {
    return { error: "Previše pokušaja prijave. Pokušajte ponovno za nekoliko minuta." };
  }

  const user = await db.hvacUser.findFirst({ where: { email, isActive: true, deletedAt: null } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordLoginAttempt(email, false, "hvac_login");
    return { error: "Neispravna e-mail adresa ili lozinka." };
  }

  const membership = await db.hvacTenantUser.findFirst({
    where: { userId: user.id, isActive: true, tenant: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    return { error: "Vaš račun trenutno nije povezan ni s jednom tvrtkom." };
  }

  await recordLoginAttempt(email, true, "hvac_login");
  await db.hvacUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setHvacSession({ uid: user.id, tid: membership.tenantId, role: membership.role });
  redirect(`${HVAC_ROUTES.login}/nadzorna-ploca`);
}

export async function logoutHvac(): Promise<void> {
  await clearHvacSession();
  redirect(`${HVAC_ROUTES.login}/prijava`);
}

export type ResetResult = { error?: string; ok?: boolean };

export async function requestPasswordReset(_prev: ResetResult, form: FormData): Promise<ResetResult> {
  const email = fd(form, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Unesite ispravnu e-mail adresu." };

  const user = await db.hvacUser.findFirst({ where: { email, isActive: true, deletedAt: null } });
  if (user) {
    const resetToken = token();
    await db.hvacUser.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60_000) },
    });
    const url = `${site()}${HVAC_ROUTES.login}/reset-lozinke?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: "Varel HVAC — ponovno postavljanje lozinke",
      text: `Za postavljanje nove lozinke otvorite poveznicu (vrijedi 1 sat):\n${url}\n\nAko niste zatražili promjenu, zanemarite ovu poruku.`,
    }).catch(() => {});
  }
  // Never reveal whether the address exists (anti-enumeration).
  return { ok: true };
}

export async function resetPassword(_prev: ResetResult, form: FormData): Promise<ResetResult> {
  const tok = fd(form, "token");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Lozinka mora imati najmanje 10 znakova." };

  const user = await db.hvacUser.findFirst({
    where: { resetToken: tok, resetTokenExpires: { gt: new Date() } },
  });
  if (!user) return { error: "Poveznica je nevažeća ili je istekla." };

  await db.hvacUser.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetToken: null, resetTokenExpires: null },
  });
  redirect(`${HVAC_ROUTES.login}/prijava?reset=1`);
}
