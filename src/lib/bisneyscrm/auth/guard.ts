import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { BisneysUser } from "@/generated/prisma/client";
import { readBisneysToken, BISNEYS_BASE } from "./session";

/**
 * Server-side authorization for Bisneys CRM. Every guard re-verifies the user
 * against the database on each request — a valid JWT alone is never enough
 * (deactivated user or bumped sessionVersion revokes access immediately).
 * Hiding buttons in the UI is never the control (brief §10.2, §11).
 */

export async function getBisneysUser(): Promise<BisneysUser | null> {
  const token = await readBisneysToken();
  if (!token) return null;
  const user = await db.bisneysUser.findUnique({ where: { id: token.uid } });
  if (!user || !user.isActive) return null;
  // Password change / "log out everywhere" invalidates older sessions.
  if (user.sessionVersion !== token.sv) return null;
  return user;
}

/** Full guard for CRM pages: requires login AND that the forced change is done. */
export async function requireBisneysUser(): Promise<BisneysUser> {
  const user = await getBisneysUser();
  if (!user) redirect(`${BISNEYS_BASE}/login`);
  if (user.mustChangePassword) redirect(`${BISNEYS_BASE}/change-password`);
  return user;
}

/** Guard for the change-password page: logged in, but the change not yet done. */
export async function requireBisneysUserForPasswordChange(): Promise<BisneysUser> {
  const user = await getBisneysUser();
  if (!user) redirect(`${BISNEYS_BASE}/login`);
  return user;
}

/** Superadmin-only areas (users, Trello, audit log, system settings). */
export async function requireBisneysSuperadmin(): Promise<BisneysUser> {
  const user = await requireBisneysUser();
  if (user.role !== "SUPERADMIN") redirect(`${BISNEYS_BASE}/403`);
  return user;
}
