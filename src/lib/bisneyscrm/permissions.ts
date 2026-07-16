import type { BisneysRole } from "@/generated/prisma/client";

/**
 * Role capability model (brief §10). MVP has two roles. SUPERADMIN can do
 * everything; ADMIN is denied user management, Trello credentials, audit-log
 * deletion and global/system settings. These flags gate BOTH navigation
 * rendering AND server-side page/action guards (`requireBisneysSuperadmin`).
 */

/** Capabilities reserved for SUPERADMIN only. */
export type SuperadminCapability =
  | "manage_users"
  | "manage_trello"
  | "view_audit_log"
  | "manage_system_settings"
  | "manage_relationship_types"
  | "manage_alert_rules";

export function isSuperadmin(role: BisneysRole): boolean {
  return role === "SUPERADMIN";
}

export function can(role: BisneysRole, _cap: SuperadminCapability): boolean {
  // Every listed capability is superadmin-only in the MVP.
  return isSuperadmin(role);
}
