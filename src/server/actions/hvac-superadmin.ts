"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/security";
import {
  ensureSuperadminBootstrap, verifyPassword, hashPassword, validateSuperadminPassword,
  setSuperadminSession, clearSuperadminSession, getSuperadmin, requireSuperadminForPasswordChange,
  auditSuperadmin, SA_BASE,
} from "@/lib/hvac/superadmin";

/** Never reveals whether the username exists or why auth failed. */
const GENERIC_ERROR = "Korisničko ime ili zaporka nisu ispravni.";

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
/** Rate-limit key namespaced away from tenant/CMS logins. */
const rlKey = (username: string) => `sa:${username.toLowerCase()}`;

export type SaLoginResult = { error?: string };

export async function superadminLogin(_prev: SaLoginResult, form: FormData): Promise<SaLoginResult> {
  await ensureSuperadminBootstrap();

  const username = f(form, "username").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: GENERIC_ERROR };

  if (await isLoginRateLimited(rlKey(username))) {
    await auditSuperadmin("superadmin_login_rate_limited", null, { username });
    return { error: "Previše neuspjelih pokušaja. Pokušajte ponovno za nekoliko minuta." };
  }

  const sa = await db.hvacSuperadmin.findUnique({ where: { username } });
  if (!sa || !sa.isActive) {
    await recordLoginAttempt(rlKey(username), false, "sa_unknown_or_inactive");
    await auditSuperadmin("superadmin_login_failed", null, { username, reason: "unknown_or_inactive" });
    return { error: GENERIC_ERROR };
  }

  if (!(await verifyPassword(password, sa.passwordHash))) {
    await recordLoginAttempt(rlKey(username), false, "sa_bad_password");
    await auditSuperadmin("superadmin_login_failed", sa.id, { reason: "bad_password" });
    return { error: GENERIC_ERROR };
  }

  await recordLoginAttempt(rlKey(username), true, "sa_login");
  await db.hvacSuperadmin.update({ where: { id: sa.id }, data: { lastLoginAt: new Date() } });
  await setSuperadminSession(sa);
  await auditSuperadmin(sa.mustChangePassword ? "superadmin_first_login" : "superadmin_login", sa.id);

  // No superadministration content before the mandatory password change.
  redirect(sa.mustChangePassword ? `${SA_BASE}/promjena-zaporke` : SA_BASE);
}

export type SaPasswordResult = { error?: string };

export async function superadminChangePassword(_prev: SaPasswordResult, form: FormData): Promise<SaPasswordResult> {
  const sa = await requireSuperadminForPasswordChange();

  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const repeat = String(form.get("repeatPassword") ?? "");

  if (!(await verifyPassword(current, sa.passwordHash))) {
    await auditSuperadmin("superadmin_password_change_failed", sa.id, { reason: "bad_current" });
    return { error: "Trenutna zaporka nije ispravna." };
  }
  if (next !== repeat) return { error: "Zaporke se ne podudaraju." };

  // Server-side policy is authoritative (client validation is only UX).
  const reused = await verifyPassword(next, sa.passwordHash);
  const problem = validateSuperadminPassword(next, sa.username, reused);
  if (problem) return { error: problem };

  await db.hvacSuperadmin.update({
    where: { id: sa.id },
    data: {
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      // Invalidates every existing session (including this one) …
      sessionVersion: { increment: 1 },
    },
  });

  // … then issue a fresh session for the current device only.
  const updated = await db.hvacSuperadmin.findUnique({ where: { id: sa.id } });
  if (updated) await setSuperadminSession(updated);
  await auditSuperadmin("superadmin_password_changed", sa.id);

  redirect(SA_BASE);
}

export async function superadminLogout(): Promise<void> {
  const sa = await getSuperadmin();
  if (sa) await auditSuperadmin("superadmin_logout", sa.id);
  await clearSuperadminSession();
  redirect(`${SA_BASE}/prijava`);
}
