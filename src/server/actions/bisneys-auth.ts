"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import {
  hashPassword,
  verifyPassword,
  setBisneysSession,
  clearBisneysSession,
  isBisneysEnabled,
  BISNEYS_BASE,
} from "@/lib/bisneyscrm/auth/session";
import {
  getBisneysUser,
  requireBisneysUser,
  requireBisneysUserForPasswordChange,
} from "@/lib/bisneyscrm/auth/guard";
import { validateBisneysPassword } from "@/lib/bisneyscrm/auth/password";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { ensureBisneysBootstrap } from "@/lib/bisneyscrm/bootstrap";

/** Never reveals whether the identifier exists or why authentication failed. */
const GENERIC_ERROR = "Korisničko ime/email ili zaporka nisu ispravni.";

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
/** Rate-limit key namespaced away from the CMS / HVAC / superadmin logins. */
const rlKey = (identifier: string) => `bisneys:${identifier.toLowerCase()}`;

export type BisneysLoginResult = { error?: string };

export async function bisneysLogin(
  _prev: BisneysLoginResult,
  form: FormData
): Promise<BisneysLoginResult> {
  if (!isBisneysEnabled()) return { error: "Bisneys CRM trenutačno nije dostupan." };
  // Idempotently ensure the seed users exist (env-driven; no-op once created).
  await ensureBisneysBootstrap();

  const identifier = f(form, "identifier").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: GENERIC_ERROR };

  if (await isLoginRateLimited(rlKey(identifier))) {
    await bisneysAudit({ action: "login_rate_limited", entityType: "auth", after: { identifier } });
    return { error: "Previše neuspjelih pokušaja. Pokušajte ponovno za nekoliko minuta." };
  }

  const user = await db.bisneysUser.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  if (!user || !user.isActive) {
    await recordLoginAttempt(rlKey(identifier), false, "unknown_or_inactive");
    await bisneysAudit({ action: "login_failed", entityType: "auth", after: { identifier, reason: "unknown_or_inactive" } });
    return { error: GENERIC_ERROR };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordLoginAttempt(rlKey(identifier), false, "bad_password");
    await bisneysAudit({ userId: user.id, action: "login_failed", entityType: "auth", after: { reason: "bad_password" } });
    return { error: GENERIC_ERROR };
  }

  await recordLoginAttempt(rlKey(identifier), true, "login");
  await db.bisneysUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setBisneysSession({ uid: user.id, sv: user.sessionVersion, role: user.role });
  await bisneysAudit({ userId: user.id, action: user.mustChangePassword ? "first_login" : "login", entityType: "auth" });

  redirect(user.mustChangePassword ? `${BISNEYS_BASE}/change-password` : `${BISNEYS_BASE}/dashboard`);
}

export type BisneysPasswordResult = { error?: string };

export async function bisneysChangePassword(
  _prev: BisneysPasswordResult,
  form: FormData
): Promise<BisneysPasswordResult> {
  const user = await requireBisneysUserForPasswordChange();

  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const repeat = String(form.get("repeatPassword") ?? "");

  if (!(await verifyPassword(current, user.passwordHash))) {
    await bisneysAudit({ userId: user.id, action: "password_change_failed", entityType: "auth", after: { reason: "bad_current" } });
    return { error: "Trenutna zaporka nije ispravna." };
  }
  if (next !== repeat) return { error: "Nove zaporke se ne podudaraju." };

  // Server-side policy is authoritative.
  const reused = await verifyPassword(next, user.passwordHash);
  const problem = validateBisneysPassword(next, { reused });
  if (problem) return { error: problem };

  await db.bisneysUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      // Invalidates every existing session (revokes other devices too)…
      sessionVersion: { increment: 1 },
    },
  });

  // …then issue a fresh session for the current device only.
  const updated = await db.bisneysUser.findUnique({ where: { id: user.id } });
  if (updated) await setBisneysSession({ uid: updated.id, sv: updated.sessionVersion, role: updated.role });
  await bisneysAudit({ userId: user.id, action: "password_changed", entityType: "auth" });

  redirect(`${BISNEYS_BASE}/dashboard`);
}

/** "Log out of all other devices" from account settings (brief §9). */
export async function bisneysLogoutAllDevices(): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysUser.update({
    where: { id: user.id },
    data: { sessionVersion: { increment: 1 } },
  });
  const updated = await db.bisneysUser.findUnique({ where: { id: user.id } });
  if (updated) await setBisneysSession({ uid: updated.id, sv: updated.sessionVersion, role: updated.role });
  await bisneysAudit({ userId: user.id, action: "logout_all_devices", entityType: "auth" });
  redirect(`${BISNEYS_BASE}/settings/account`);
}

export async function bisneysLogout(): Promise<void> {
  const user = await getBisneysUser();
  if (user) await bisneysAudit({ userId: user.id, action: "logout", entityType: "auth" });
  await clearBisneysSession();
  redirect(`${BISNEYS_BASE}/login`);
}
