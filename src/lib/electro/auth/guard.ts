import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type {
  ElectroCompany,
  ElectroCompanySubscription,
  ElectroSubscriptionPlan,
  ElectroSuperadmin,
  ElectroUser,
} from "@/generated/prisma/client";
import type { ElectroRoleKey } from "../constants";
import { effectiveSubscriptionStatus, isOperational } from "../subscription";
import {
  readElectroToken,
  readElectroSaToken,
  ELECTRO_BASE,
  ELECTRO_APP_BASE,
  ELECTRO_SUPERADMIN_BASE,
} from "./session";

/**
 * Server-side authorization for Varel Electric. Every guard re-verifies the
 * user against the database on each request — a valid JWT alone is never
 * enough (deactivation, archival, sessionVersion bump or a suspended company
 * revokes access immediately). Hiding buttons is never the control (brief §7,
 * §69): actions must call these guards again.
 */

export type ElectroContext = {
  user: ElectroUser;
  company: ElectroCompany;
  subscription: ElectroCompanySubscription & { plan: ElectroSubscriptionPlan };
  /** Effective status right now (an expired trial reads as EXPIRED). */
  status: ElectroCompanySubscription["status"];
  roles: ElectroRoleKey[];
};

export function hasRole(ctx: ElectroContext, role: ElectroRoleKey): boolean {
  return ctx.roles.includes(role);
}

/** Loads the full tenant context for the session user, or null. */
export async function getElectroContext(): Promise<ElectroContext | null> {
  const token = await readElectroToken();
  if (!token) return null;
  const user = await db.electroUser.findUnique({
    where: { id: token.uid },
    include: {
      company: { include: { subscription: { include: { plan: true } } } },
      roles: { include: { role: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  if (user.sessionVersion !== token.sv) return null;
  const { company, roles, ...plain } = user;
  if (!company || company.isArchived || !company.subscription) return null;
  return {
    user: plain as ElectroUser,
    company,
    subscription: company.subscription,
    status: effectiveSubscriptionStatus(company.subscription),
    roles: roles.map((r) => r.role.key as ElectroRoleKey),
  };
}

/**
 * Full guard for app pages: requires login AND an operational subscription
 * (TRIAL or ACTIVE). Blocked companies land on the status page, which uses
 * requireElectroContextAnyStatus so it stays reachable.
 */
export async function requireElectroContext(): Promise<ElectroContext> {
  const ctx = await getElectroContext();
  if (!ctx) redirect(`${ELECTRO_BASE}/prijava`);
  if (ctx.user.mustChangePassword) redirect(`${ELECTRO_APP_BASE}/promjena-lozinke`);
  if (!isOperational(ctx.status)) redirect(`${ELECTRO_APP_BASE}/status`);
  return ctx;
}

/** Login required, but any subscription status (status page, logout). */
export async function requireElectroContextAnyStatus(): Promise<ElectroContext> {
  const ctx = await getElectroContext();
  if (!ctx) redirect(`${ELECTRO_BASE}/prijava`);
  return ctx;
}

/** Company-admin-only areas (employees, roles, settings, billing). */
export async function requireElectroAdmin(): Promise<ElectroContext> {
  const ctx = await requireElectroContext();
  if (!hasRole(ctx, "ADMIN")) redirect(`${ELECTRO_APP_BASE}/403`);
  return ctx;
}

/** Global platform superadmin (brief §8) — separate accounts and cookie. */
export async function getElectroSuperadmin(): Promise<ElectroSuperadmin | null> {
  const token = await readElectroSaToken();
  if (!token) return null;
  const sa = await db.electroSuperadmin.findUnique({ where: { id: token.said } });
  if (!sa || !sa.isActive) return null;
  if (sa.sessionVersion !== token.sv) return null;
  return sa;
}

export async function requireElectroSuperadmin(): Promise<ElectroSuperadmin> {
  const sa = await getElectroSuperadmin();
  if (!sa) redirect(`${ELECTRO_SUPERADMIN_BASE}/prijava`);
  return sa;
}
