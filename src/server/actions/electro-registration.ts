"use server";

import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import { isElectroEnabled } from "@/lib/electro/auth/session";
import { electroAudit } from "@/lib/electro/audit";
import { ensureElectroBootstrap } from "@/lib/electro/bootstrap";

/**
 * Public company registration (brief §5): creates the organisation in
 * PENDING_APPROVAL with its first admin as an INVITED user. Nothing is
 * activated automatically — the trial starts only when a Varel superadmin
 * approves the request and the admin receives the password-setup invite.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Default plan a new registration trials on; superadmin can change it. */
const DEFAULT_TRIAL_PLAN_KEY = "professional";

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroRegistrationResult = { error?: string; ok?: boolean };

export async function electroRegisterCompany(
  _prev: ElectroRegistrationResult,
  form: FormData
): Promise<ElectroRegistrationResult> {
  if (!isElectroEnabled()) return { error: "Varel Electric trenutačno nije dostupan." };
  await ensureElectroBootstrap();

  const companyName = f(form, "companyName");
  const oib = f(form, "oib");
  const address = f(form, "address");
  const city = f(form, "city");
  const firstName = f(form, "firstName");
  const lastName = f(form, "lastName");
  const email = f(form, "email").toLowerCase();
  const phone = f(form, "phone");

  if (!companyName || !firstName || !lastName || !email) {
    return { error: "Ispunite sva obavezna polja (tvrtka, ime, prezime, e-mail)." };
  }
  if (!EMAIL_RE.test(email)) return { error: "E-mail adresa nije ispravna." };

  // Same limiter as logins: registration must not be a spam/enumeration vector.
  const rl = `electro-reg:${email}`;
  if (await isLoginRateLimited(rl)) {
    return { error: "Previše pokušaja. Pokušajte ponovno za nekoliko minuta." };
  }
  await recordLoginAttempt(rl, true, "registration_attempt");

  const existing = await db.electroUser.findUnique({ where: { email } });
  if (existing) {
    // No account enumeration: identical outward behaviour as success.
    await electroAudit({ action: "registration_duplicate_email", entityType: "registration", after: { email } });
    return { ok: true };
  }

  const plan = await db.electroSubscriptionPlan.findUnique({ where: { key: DEFAULT_TRIAL_PLAN_KEY } });
  if (!plan) return { error: "Registracija trenutačno nije moguća. Pokušajte kasnije." };
  const adminRole = await db.electroRole.findUnique({ where: { key: "ADMIN" } });
  if (!adminRole) return { error: "Registracija trenutačno nije moguća. Pokušajte kasnije." };

  const company = await db.$transaction(async (tx) => {
    const c = await tx.electroCompany.create({
      data: {
        name: companyName,
        oib: oib || null,
        address: address || null,
        city: city || null,
        contactName: `${firstName} ${lastName}`,
        contactEmail: email,
        contactPhone: phone || null,
        subscription: { create: { planId: plan.id, status: "PENDING_APPROVAL" } },
      },
    });
    const admin = await tx.electroUser.create({
      data: { companyId: c.id, firstName, lastName, email, phone: phone || null, status: "INVITED" },
    });
    await tx.electroUserRole.create({
      data: { userId: admin.id, roleId: adminRole.id, companyId: c.id },
    });
    return c;
  });

  await electroAudit({
    companyId: company.id,
    action: "company_registration_requested",
    entityType: "company",
    entityId: company.id,
    after: { companyName, email },
  });

  // Notify platform staff; registration succeeds even if email is unconfigured.
  if (isEmailConfigured() && process.env.ADMIN_NOTIFY_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: `Varel Electric — nova registracija: ${companyName}`,
      text: `Tvrtka "${companyName}" (${email}) zatražila je pristup Varel Electricu i čeka odobrenje u superadministraciji.`,
    });
  }

  return { ok: true };
}
