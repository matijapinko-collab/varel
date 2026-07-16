"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ELECTRO_BASE, ELECTRO_APP_BASE, ELECTRO_ROLES, type ElectroRoleKey } from "@/lib/electro/constants";
import { checkIntLimit } from "@/lib/electro/limits";
import { countBillableUsers, countAdmins, isLastActiveAdmin, LAST_ADMIN_MESSAGE } from "@/lib/electro/team";
import { createElectroInvite } from "@/lib/electro/invites";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Employee management (brief §9, §14). Admin-only. companyId is ALWAYS taken
 * from the authenticated context — every target row is loaded with a
 * { id, companyId: ctx.company.id } filter so one tenant can never touch
 * another tenant's users, even with a forged id.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEAM_PATH = `${ELECTRO_APP_BASE}/zaposlenici`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function roleKeysFrom(form: FormData): ElectroRoleKey[] {
  const valid = new Set<string>(Object.values(ELECTRO_ROLES));
  return [...new Set(form.getAll("roles").filter((r): r is string => typeof r === "string"))]
    .filter((r) => valid.has(r)) as ElectroRoleKey[];
}

function idsFrom(form: FormData, key: string): string[] {
  return [...new Set(form.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0))];
}

async function sendInviteEmail(user: { email: string; firstName: string }, companyName: string, rawToken: string, expiresAt: Date) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${site}${ELECTRO_BASE}/postavi-lozinku/${rawToken}`;
  if (isEmailConfigured()) {
    await sendEmail({
      to: user.email,
      subject: `Varel Electric — poziv u tvrtku ${companyName}`,
      text: `Poštovani ${user.firstName},\n\ndodani ste kao korisnik tvrtke "${companyName}" u Varel Electricu.\n\nPostavite svoju lozinku putem poveznice (vrijedi do ${expiresAt.toLocaleDateString("hr-HR")}):\n${link}\n\nVarel tim`,
    });
  } else {
    console.info(`[electro] invite link for ${user.email}: ${link}`);
  }
}

export type ElectroTeamResult = { error?: string; ok?: boolean };

export async function electroCreateEmployee(
  _prev: ElectroTeamResult,
  form: FormData
): Promise<ElectroTeamResult> {
  const ctx = await requireElectroAdmin();

  const firstName = f(form, "firstName");
  const lastName = f(form, "lastName");
  const email = f(form, "email").toLowerCase();
  const phone = f(form, "phone");
  const jobTitle = f(form, "jobTitle");
  const roleKeys = roleKeysFrom(form);
  const branchIds = idsFrom(form, "branchIds");
  const departmentIds = idsFrom(form, "departmentIds");

  if (!firstName || !lastName || !email) return { error: "Ime, prezime i e-mail su obavezni." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail adresa nije ispravna." };
  if (roleKeys.length === 0) return { error: "Odaberite najmanje jednu ulogu." };

  // Backend limit checks (brief §72) — the frontend only mirrors these.
  const userLimit = await checkIntLimit(ctx.subscription.planId, "maxUsers", await countBillableUsers(ctx.company.id));
  if (userLimit) return { error: userLimit };
  if (roleKeys.includes("ADMIN")) {
    const adminLimit = await checkIntLimit(ctx.subscription.planId, "maxAdmins", await countAdmins(ctx.company.id));
    if (adminLimit) return { error: adminLimit };
  }

  if (await db.electroUser.findUnique({ where: { email } })) {
    return { error: "Korisnik s ovom e-mail adresom već postoji." };
  }

  // Branches/departments must belong to THIS company (tenant isolation).
  const [validBranches, validDepartments, roles] = await Promise.all([
    db.electroBranch.findMany({ where: { id: { in: branchIds }, companyId: ctx.company.id } }),
    db.electroDepartment.findMany({ where: { id: { in: departmentIds }, companyId: ctx.company.id } }),
    db.electroRole.findMany({ where: { key: { in: roleKeys } } }),
  ]);

  const user = await db.$transaction(async (tx) => {
    const u = await tx.electroUser.create({
      data: {
        companyId: ctx.company.id,
        firstName,
        lastName,
        email,
        phone: phone || null,
        jobTitle: jobTitle || null,
        status: "INVITED",
      },
    });
    await tx.electroUserRole.createMany({
      data: roles.map((r) => ({ userId: u.id, roleId: r.id, companyId: ctx.company.id })),
    });
    if (validBranches.length) {
      await tx.electroUserBranch.createMany({ data: validBranches.map((b) => ({ userId: u.id, branchId: b.id })) });
    }
    if (validDepartments.length) {
      await tx.electroUserDepartment.createMany({ data: validDepartments.map((d) => ({ userId: u.id, departmentId: d.id })) });
    }
    return u;
  });

  const { rawToken, expiresAt } = await createElectroInvite({
    userId: user.id,
    companyId: ctx.company.id,
    invitedByUserId: ctx.user.id,
  });
  await sendInviteEmail(user, ctx.company.name, rawToken, expiresAt);

  await electroAudit({
    companyId: ctx.company.id,
    userId: ctx.user.id,
    action: "employee_created",
    entityType: "user",
    entityId: user.id,
    after: { email, roles: roleKeys },
  });

  redirect(TEAM_PATH);
}

export async function electroUpdateEmployee(
  _prev: ElectroTeamResult,
  form: FormData
): Promise<ElectroTeamResult> {
  const ctx = await requireElectroAdmin();
  const userId = f(form, "userId");

  const target = await db.electroUser.findFirst({
    where: { id: userId, companyId: ctx.company.id },
    include: { roles: { include: { role: true } } },
  });
  if (!target) return { error: "Korisnik nije pronađen." };

  const firstName = f(form, "firstName");
  const lastName = f(form, "lastName");
  const phone = f(form, "phone");
  const jobTitle = f(form, "jobTitle");
  const roleKeys = roleKeysFrom(form);
  const branchIds = idsFrom(form, "branchIds");
  const departmentIds = idsFrom(form, "departmentIds");

  if (!firstName || !lastName) return { error: "Ime i prezime su obavezni." };
  if (roleKeys.length === 0) return { error: "Odaberite najmanje jednu ulogu." };

  const hadAdmin = target.roles.some((r) => r.role.key === "ADMIN");
  const willHaveAdmin = roleKeys.includes("ADMIN");

  // Last-admin protection (brief §9) — applies to everyone, including self.
  if (hadAdmin && !willHaveAdmin && (await isLastActiveAdmin(ctx.company.id, target.id))) {
    return { error: LAST_ADMIN_MESSAGE };
  }
  if (!hadAdmin && willHaveAdmin) {
    const adminLimit = await checkIntLimit(ctx.subscription.planId, "maxAdmins", await countAdmins(ctx.company.id));
    if (adminLimit) return { error: adminLimit };
  }

  const [validBranches, validDepartments, roles] = await Promise.all([
    db.electroBranch.findMany({ where: { id: { in: branchIds }, companyId: ctx.company.id } }),
    db.electroDepartment.findMany({ where: { id: { in: departmentIds }, companyId: ctx.company.id } }),
    db.electroRole.findMany({ where: { key: { in: roleKeys } } }),
  ]);

  await db.$transaction(async (tx) => {
    await tx.electroUser.update({
      where: { id: target.id },
      data: { firstName, lastName, phone: phone || null, jobTitle: jobTitle || null },
    });
    await tx.electroUserRole.deleteMany({ where: { userId: target.id } });
    await tx.electroUserRole.createMany({
      data: roles.map((r) => ({ userId: target.id, roleId: r.id, companyId: ctx.company.id })),
    });
    await tx.electroUserBranch.deleteMany({ where: { userId: target.id } });
    if (validBranches.length) {
      await tx.electroUserBranch.createMany({ data: validBranches.map((b) => ({ userId: target.id, branchId: b.id })) });
    }
    await tx.electroUserDepartment.deleteMany({ where: { userId: target.id } });
    if (validDepartments.length) {
      await tx.electroUserDepartment.createMany({ data: validDepartments.map((d) => ({ userId: target.id, departmentId: d.id })) });
    }
  });

  await electroAudit({
    companyId: ctx.company.id,
    userId: ctx.user.id,
    action: "employee_updated",
    entityType: "user",
    entityId: target.id,
    before: { roles: target.roles.map((r) => r.role.key) },
    after: { roles: roleKeys },
  });

  revalidatePath(TEAM_PATH);
  return { ok: true };
}

/** Activate / deactivate / archive (brief §14: archiving preserves all history). */
export async function electroSetEmployeeStatus(
  _prev: ElectroTeamResult,
  form: FormData
): Promise<ElectroTeamResult> {
  const ctx = await requireElectroAdmin();
  const userId = f(form, "userId");
  const action = f(form, "statusAction"); // "activate" | "deactivate" | "archive"

  const target = await db.electroUser.findFirst({ where: { id: userId, companyId: ctx.company.id } });
  if (!target) return { error: "Korisnik nije pronađen." };
  if (target.status === "ARCHIVED") return { error: "Arhiviranog korisnika nije moguće mijenjati." };

  if (action === "activate") {
    if (target.status !== "INACTIVE" && target.status !== "SUSPENDED") {
      return { error: "Samo deaktiviranog korisnika moguće je ponovno aktivirati." };
    }
    await db.electroUser.update({ where: { id: target.id }, data: { status: "ACTIVE" } });
  } else if (action === "deactivate" || action === "archive") {
    if (await isLastActiveAdmin(ctx.company.id, target.id)) return { error: LAST_ADMIN_MESSAGE };
    await db.electroUser.update({
      where: { id: target.id },
      data: {
        status: action === "archive" ? "ARCHIVED" : "INACTIVE",
        archivedAt: action === "archive" ? new Date() : null,
        // Revokes any live session immediately.
        sessionVersion: { increment: 1 },
      },
    });
  } else {
    return { error: "Nepoznata akcija." };
  }

  await electroAudit({
    companyId: ctx.company.id,
    userId: ctx.user.id,
    action: `employee_${action}`,
    entityType: "user",
    entityId: target.id,
    before: { status: target.status },
  });

  revalidatePath(TEAM_PATH);
  return { ok: true };
}

export async function electroResendInvite(
  _prev: ElectroTeamResult,
  form: FormData
): Promise<ElectroTeamResult> {
  const ctx = await requireElectroAdmin();
  const userId = f(form, "userId");

  const target = await db.electroUser.findFirst({ where: { id: userId, companyId: ctx.company.id } });
  if (!target || target.status !== "INVITED") return { error: "Pozivnicu je moguće ponovno poslati samo pozvanom korisniku." };

  const { rawToken, expiresAt } = await createElectroInvite({
    userId: target.id,
    companyId: ctx.company.id,
    invitedByUserId: ctx.user.id,
  });
  await sendInviteEmail(target, ctx.company.name, rawToken, expiresAt);
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "invite_resent", entityType: "user", entityId: target.id });

  revalidatePath(TEAM_PATH);
  return { ok: true };
}
