import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "./auth/session";
import { ELECTRO_ROLES, ELECTRO_ROLE_NAMES, type ElectroRoleKey } from "./constants";

/**
 * Idempotent seeding for Varel Electric (brief §5, §7, §8):
 *  - the initial global superadmin from environment secrets (never hardcoded,
 *    never logged — hashed and stored, same rules as Bisneys bootstrap),
 *  - the four system roles,
 *  - the four subscription plans with DEFAULT limits. Plans/limits are data:
 *    once created, existing rows are never overwritten, so superadmin edits
 *    survive redeploys.
 * Safe to call repeatedly (e.g. from the login action).
 */

/** Default plan limits — starting values only; editable in superadministration. */
const DEFAULT_PLANS: Array<{
  key: string;
  name: string;
  sortOrder: number;
  isEnterprise?: boolean;
  int: Record<string, number>;
  bool: Record<string, boolean>;
}> = [
  {
    key: "basic",
    name: "Basic",
    sortOrder: 1,
    int: {
      maxActiveProjects: 5,
      maxArchivedProjects: 20,
      maxUsers: 10,
      maxAdmins: 2,
      maxInvestors: 10,
      maxBranches: 1,
      maxWarehouses: 2,
      storageMb: 10_240,
      aiAnalysesPerMonth: 0,
      pdfReportsPerMonth: 20,
    },
    bool: {
      erpIntegrations: false,
      investorPortal: false,
      advancedAnalytics: false,
      customBranding: false,
      eSigning: false,
      apiAccess: false,
    },
  },
  {
    key: "professional",
    name: "Professional",
    sortOrder: 2,
    int: {
      maxActiveProjects: 20,
      maxArchivedProjects: 100,
      maxUsers: 30,
      maxAdmins: 5,
      maxInvestors: 50,
      maxBranches: 3,
      maxWarehouses: 6,
      storageMb: 51_200,
      aiAnalysesPerMonth: 100,
      pdfReportsPerMonth: 100,
    },
    bool: {
      erpIntegrations: false,
      investorPortal: true,
      advancedAnalytics: false,
      customBranding: false,
      eSigning: false,
      apiAccess: false,
    },
  },
  {
    key: "business",
    name: "Business",
    sortOrder: 3,
    int: {
      maxActiveProjects: 100,
      maxArchivedProjects: 500,
      maxUsers: 100,
      maxAdmins: 15,
      maxInvestors: 200,
      maxBranches: 10,
      maxWarehouses: 20,
      storageMb: 204_800,
      aiAnalysesPerMonth: 500,
      pdfReportsPerMonth: 500,
    },
    bool: {
      erpIntegrations: true,
      investorPortal: true,
      advancedAnalytics: true,
      customBranding: true,
      eSigning: false,
      apiAccess: false,
    },
  },
  {
    key: "enterprise",
    name: "Enterprise",
    sortOrder: 4,
    isEnterprise: true,
    int: {
      maxActiveProjects: 1_000,
      maxArchivedProjects: 10_000,
      maxUsers: 1_000,
      maxAdmins: 100,
      maxInvestors: 2_000,
      maxBranches: 100,
      maxWarehouses: 200,
      storageMb: 1_048_576,
      aiAnalysesPerMonth: 5_000,
      pdfReportsPerMonth: 5_000,
    },
    bool: {
      erpIntegrations: true,
      investorPortal: true,
      advancedAnalytics: true,
      customBranding: true,
      eSigning: true,
      apiAccess: true,
    },
  },
];

export async function ensureElectroBootstrap(): Promise<string[]> {
  const created: string[] = [];

  // 1. System roles.
  for (const key of Object.values(ELECTRO_ROLES)) {
    const exists = await db.electroRole.findUnique({ where: { key } });
    if (exists) continue;
    await db.electroRole.create({
      data: { key, name: ELECTRO_ROLE_NAMES[key as ElectroRoleKey], isSystem: true },
    });
    created.push(`role:${key}`);
  }

  // 2. Subscription plans + default limits (existing rows never overwritten).
  for (const plan of DEFAULT_PLANS) {
    let row = await db.electroSubscriptionPlan.findUnique({ where: { key: plan.key } });
    if (!row) {
      row = await db.electroSubscriptionPlan.create({
        data: {
          key: plan.key,
          name: plan.name,
          sortOrder: plan.sortOrder,
          isEnterprise: plan.isEnterprise ?? false,
          trialDays: 10,
        },
      });
      created.push(`plan:${plan.key}`);
    }
    for (const [key, intValue] of Object.entries(plan.int)) {
      await db.electroPlanLimit.upsert({
        where: { planId_key: { planId: row.id, key } },
        create: { planId: row.id, key, intValue },
        update: {}, // never overwrite superadmin-edited values
      });
    }
    for (const [key, boolValue] of Object.entries(plan.bool)) {
      await db.electroPlanLimit.upsert({
        where: { planId_key: { planId: row.id, key } },
        create: { planId: row.id, key, boolValue },
        update: {},
      });
    }
  }

  // 3. Initial global superadmin from env secrets.
  const u = process.env.ELECTRO_SUPERADMIN_USERNAME?.trim().toLowerCase();
  const e = process.env.ELECTRO_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const p = process.env.ELECTRO_SUPERADMIN_INITIAL_PASSWORD;
  if (u && e && p) {
    const exists = await db.electroSuperadmin.findFirst({
      where: { OR: [{ username: u }, { email: e }] },
    });
    if (!exists) {
      await db.electroSuperadmin.create({
        data: { username: u, email: e, passwordHash: await hashPassword(p), isActive: true },
      });
      created.push("superadmin");
    }
  }

  if (created.length) console.info(`[electro] bootstrapped: ${created.join(", ")}`); // no credentials logged
  return created;
}
