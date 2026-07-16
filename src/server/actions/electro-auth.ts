"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import {
  hashPassword,
  verifyPassword,
  setElectroSession,
  clearElectroSession,
  setElectroSaSession,
  clearElectroSaSession,
  isElectroEnabled,
  ELECTRO_BASE,
  ELECTRO_APP_BASE,
  ELECTRO_SUPERADMIN_BASE,
} from "@/lib/electro/auth/session";
import {
  getElectroContext,
  requireElectroContextAnyStatus,
  getElectroSuperadmin,
} from "@/lib/electro/auth/guard";
import { validateElectroPassword } from "@/lib/electro/auth/password";
import { findLiveInvite } from "@/lib/electro/invites";
import { electroAudit } from "@/lib/electro/audit";
import { ensureElectroBootstrap } from "@/lib/electro/bootstrap";

/** Never reveals whether the identifier exists or why authentication failed. */
const GENERIC_ERROR = "E-mail adresa ili lozinka nisu ispravni.";
const DISABLED_ERROR = "Varel Electric trenutačno nije dostupan.";

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
/** Rate-limit keys namespaced away from the CMS / Bisneys / HVAC logins. */
const rlKey = (identifier: string) => `electro:${identifier.toLowerCase()}`;
const rlSaKey = (identifier: string) => `electro-sa:${identifier.toLowerCase()}`;

export type ElectroActionResult = { error?: string; ok?: boolean };

export async function electroLogin(
  _prev: ElectroActionResult,
  form: FormData
): Promise<ElectroActionResult> {
  if (!isElectroEnabled()) return { error: DISABLED_ERROR };

  const email = f(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: GENERIC_ERROR };

  if (await isLoginRateLimited(rlKey(email))) {
    await electroAudit({ action: "login_rate_limited", entityType: "auth", after: { email } });
    return { error: "Previše neuspjelih pokušaja. Pokušajte ponovno za nekoliko minuta." };
  }

  const user = await db.electroUser.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
    await recordLoginAttempt(rlKey(email), false, "unknown_or_inactive");
    await electroAudit({ action: "login_failed", entityType: "auth", after: { email, reason: "unknown_or_inactive" } });
    return { error: GENERIC_ERROR };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordLoginAttempt(rlKey(email), false, "bad_password");
    await electroAudit({ companyId: user.companyId, userId: user.id, action: "login_failed", entityType: "auth", after: { reason: "bad_password" } });
    return { error: GENERIC_ERROR };
  }

  await recordLoginAttempt(rlKey(email), true, "login");
  await db.electroUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setElectroSession({ uid: user.id, sv: user.sessionVersion });
  await electroAudit({ companyId: user.companyId, userId: user.id, action: "login", entityType: "auth" });

  redirect(`${ELECTRO_APP_BASE}/dashboard`);
}

export async function electroLogout(): Promise<void> {
  const ctx = await getElectroContext();
  if (ctx) await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "logout", entityType: "auth" });
  await clearElectroSession();
  redirect(`${ELECTRO_BASE}/prijava`);
}

/** Invite acceptance (brief §9): the invited user sets their own password. */
export async function electroAcceptInvite(
  _prev: ElectroActionResult,
  form: FormData
): Promise<ElectroActionResult> {
  if (!isElectroEnabled()) return { error: DISABLED_ERROR };

  const token = f(form, "token");
  const password = String(form.get("password") ?? "");
  const repeat = String(form.get("repeatPassword") ?? "");

  const invite = await findLiveInvite(token);
  if (!invite) return { error: "Pozivnica nije važeća ili je istekla. Zatražite novu pozivnicu." };
  if (password !== repeat) return { error: "Lozinke se ne podudaraju." };
  const problem = validateElectroPassword(password);
  if (problem) return { error: problem };

  const passwordHash = await hashPassword(password);
  const [user] = await db.$transaction([
    db.electroUser.update({
      where: { id: invite.userId },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    }),
    // Single-use: mark consumed inside the same transaction (brief §9).
    db.electroInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);

  await setElectroSession({ uid: user.id, sv: user.sessionVersion });
  await electroAudit({ companyId: invite.companyId, userId: user.id, action: "invite_accepted", entityType: "invite", entityId: invite.id });
  redirect(`${ELECTRO_APP_BASE}/dashboard`);
}

export async function electroChangePassword(
  _prev: ElectroActionResult,
  form: FormData
): Promise<ElectroActionResult> {
  const ctx = await requireElectroContextAnyStatus();

  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const repeat = String(form.get("repeatPassword") ?? "");

  if (!ctx.user.passwordHash || !(await verifyPassword(current, ctx.user.passwordHash))) {
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "password_change_failed", entityType: "auth", after: { reason: "bad_current" } });
    return { error: "Trenutna lozinka nije ispravna." };
  }
  if (next !== repeat) return { error: "Nove lozinke se ne podudaraju." };
  const reused = await verifyPassword(next, ctx.user.passwordHash);
  const problem = validateElectroPassword(next, { reused });
  if (problem) return { error: problem };

  const updated = await db.electroUser.update({
    where: { id: ctx.user.id },
    data: {
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      // Invalidates every existing session (revokes other devices too)…
      sessionVersion: { increment: 1 },
    },
  });
  // …then issue a fresh session for the current device only.
  await setElectroSession({ uid: updated.id, sv: updated.sessionVersion });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "password_changed", entityType: "auth" });
  redirect(`${ELECTRO_APP_BASE}/dashboard`);
}

// ─────────────────────────── Superadmin sessions ────────────────────────────

export async function electroSuperadminLogin(
  _prev: ElectroActionResult,
  form: FormData
): Promise<ElectroActionResult> {
  if (!isElectroEnabled()) return { error: DISABLED_ERROR };
  // Idempotently ensure roles, plans and the seed superadmin exist.
  await ensureElectroBootstrap();

  const identifier = f(form, "identifier").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: GENERIC_ERROR };

  if (await isLoginRateLimited(rlSaKey(identifier))) {
    await electroAudit({ action: "sa_login_rate_limited", entityType: "auth", after: { identifier } });
    return { error: "Previše neuspjelih pokušaja. Pokušajte ponovno za nekoliko minuta." };
  }

  const sa = await db.electroSuperadmin.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  if (!sa || !sa.isActive || !(await verifyPassword(password, sa.passwordHash))) {
    await recordLoginAttempt(rlSaKey(identifier), false, "sa_bad_credentials");
    await electroAudit({ action: "sa_login_failed", entityType: "auth", after: { identifier } });
    return { error: GENERIC_ERROR };
  }

  await recordLoginAttempt(rlSaKey(identifier), true, "sa_login");
  await db.electroSuperadmin.update({ where: { id: sa.id }, data: { lastLoginAt: new Date() } });
  await setElectroSaSession({ said: sa.id, sv: sa.sessionVersion });
  await electroAudit({ superadminId: sa.id, action: "sa_login", entityType: "auth" });

  redirect(ELECTRO_SUPERADMIN_BASE);
}

export async function electroSuperadminLogout(): Promise<void> {
  const sa = await getElectroSuperadmin();
  if (sa) await electroAudit({ superadminId: sa.id, action: "sa_logout", entityType: "auth" });
  await clearElectroSaSession();
  redirect(`${ELECTRO_SUPERADMIN_BASE}/prijava`);
}
