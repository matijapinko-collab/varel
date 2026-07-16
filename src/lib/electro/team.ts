import "server-only";
import { db } from "@/lib/db";
import { LAST_ADMIN_MESSAGE } from "./limit-messages";

/**
 * Team helpers shared by employee-management actions (brief §9, §14).
 * The pure LAST_ADMIN_MESSAGE lives in ./limit-messages (db-free, testable).
 */

export { LAST_ADMIN_MESSAGE };

/** ACTIVE users holding the ADMIN role. INVITED admins don't count — they can't log in yet. */
export async function countActiveAdmins(companyId: string): Promise<number> {
  return db.electroUser.count({
    where: { companyId, status: "ACTIVE", roles: { some: { role: { key: "ADMIN" } } } },
  });
}

/** Non-archived users — the population `maxUsers` limits (brief §72: never delete, only block new). */
export async function countBillableUsers(companyId: string): Promise<number> {
  return db.electroUser.count({ where: { companyId, status: { not: "ARCHIVED" } } });
}

/** Users (any non-archived status) holding the ADMIN role — the `maxAdmins` population. */
export async function countAdmins(companyId: string): Promise<number> {
  return db.electroUser.count({
    where: { companyId, status: { not: "ARCHIVED" }, roles: { some: { role: { key: "ADMIN" } } } },
  });
}

/**
 * True when this user is the last ACTIVE admin of the company — in that case
 * removing their ADMIN role, deactivating or archiving them must be refused
 * (brief §9), including by the user themselves.
 */
export async function isLastActiveAdmin(companyId: string, userId: string): Promise<boolean> {
  const user = await db.electroUser.findFirst({
    where: { id: userId, companyId, status: "ACTIVE", roles: { some: { role: { key: "ADMIN" } } } },
  });
  if (!user) return false;
  return (await countActiveAdmins(companyId)) <= 1;
}
