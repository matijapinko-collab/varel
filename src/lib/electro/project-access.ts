import "server-only";
import { db } from "@/lib/db";
import type { ElectroContext } from "./auth/guard";

/**
 * Per-project access (brief §13). A project is visible to a user when:
 *  - they are an ADMIN or ENGINEER (company-wide operational oversight), or
 *  - they are an active member of that specific project.
 * Every project load is scoped to ctx.company.id first (tenant isolation),
 * then to this visibility rule. Backend is the source of truth.
 */

/** Company-wide roles that see every project without explicit membership. */
function hasCompanyWideProjectAccess(ctx: ElectroContext): boolean {
  return ctx.roles.includes("ADMIN") || ctx.roles.includes("ENGINEER");
}

/** Loads a project by id, enforcing tenant + per-project access, or null. */
export async function loadAccessibleProject(ctx: ElectroContext, projectId: string) {
  const project = await db.electroProject.findFirst({
    where: { id: projectId, companyId: ctx.company.id },
    include: {
      investors: { include: { investor: true } },
      members: { include: { user: true } },
      branch: true,
    },
  });
  if (!project) return null;
  if (hasCompanyWideProjectAccess(ctx)) return project;
  const isMember = project.members.some((m) => m.userId === ctx.user.id && m.isActive);
  return isMember ? project : null;
}

/** The where-clause fragment that lists only projects a user may see. */
export function accessibleProjectsWhere(ctx: ElectroContext) {
  if (hasCompanyWideProjectAccess(ctx)) {
    return { companyId: ctx.company.id };
  }
  return {
    companyId: ctx.company.id,
    members: { some: { userId: ctx.user.id, isActive: true } },
  };
}

/** True when the user may create/edit projects (brief §9 admin; §10 engineer). */
export function canManageProjects(ctx: ElectroContext): boolean {
  return ctx.roles.includes("ADMIN") || ctx.roles.includes("ENGINEER");
}
