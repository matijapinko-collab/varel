import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import { getHvacSession } from "./b2b-auth";
import { HVAC_ROUTES } from "./content";
import type { HvacRole, HvacTenant, HvacUser, Prisma } from "@/generated/prisma/client";

/**
 * Server-side tenant context + role guard. This is the ONLY sanctioned way to
 * reach tenant data: it re-verifies the session, active membership and tenant
 * on every request. Never rely on client filtering for isolation — every
 * tenant query must be scoped with `ctx.tenantId`.
 */

export type TenantContext = {
  userId: string;
  tenantId: string;
  role: HvacRole;
  user: Pick<HvacUser, "id" | "name" | "email" | "emailVerifiedAt">;
  tenant: HvacTenant;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getHvacSession();
  if (!session) return null;

  const membership = await db.hvacTenantUser.findFirst({
    where: { userId: session.uid, tenantId: session.tid, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, emailVerifiedAt: true, isActive: true, deletedAt: true } },
      tenant: true,
    },
  });

  if (!membership || !membership.user.isActive || membership.user.deletedAt || membership.tenant.deletedAt) {
    return null;
  }
  if (membership.tenant.status === "SUSPENDED" || membership.tenant.status === "CANCELLED") {
    return null;
  }

  return {
    userId: membership.userId,
    tenantId: membership.tenantId,
    role: membership.role,
    user: {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      emailVerifiedAt: membership.user.emailVerifiedAt,
    },
    tenant: membership.tenant,
  };
}

/** Redirects to the login page when there is no valid tenant session. */
export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect(`${HVAC_ROUTES.login}/prijava`);
  return ctx;
}

/** Requires one of the given roles; redirects to the dashboard otherwise. */
export async function requireTenantRole(roles: HvacRole[]): Promise<TenantContext> {
  const ctx = await requireTenantContext();
  if (!roles.includes(ctx.role)) redirect(`${HVAC_ROUTES.login}/nadzorna-ploca`);
  return ctx;
}

/** Financial screens: owner + administrator + accountant. */
export const FINANCIAL_ROLES: HvacRole[] = ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"];
export const MANAGE_ROLES: HvacRole[] = ["OWNER", "ADMINISTRATOR"];

/* ---------------- logging ---------------- */

export async function logActivity(
  ctx: TenantContext,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await db.hvacActivityLog.create({
      data: { tenantId: ctx.tenantId, userId: ctx.userId, action, entityType, entityId, metaJson: meta },
    });
  } catch (e) {
    console.error("[hvac activity] failed", (e as Error).message);
  }
}

export async function logAudit(
  ctx: Pick<TenantContext, "tenantId" | "userId">,
  action: string,
  opts?: { entityType?: string; entityId?: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue },
): Promise<void> {
  try {
    const meta = await requestMeta();
    await db.hvacAuditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action,
        entityType: opts?.entityType,
        entityId: opts?.entityId,
        beforeJson: opts?.before,
        afterJson: opts?.after,
        ipHash: meta.ipHash,
      },
    });
  } catch (e) {
    console.error("[hvac audit] failed", (e as Error).message);
  }
}
