/** Varel Electric route bases (brief §4). */
export const ELECTRO_BASE = "/electro";
/** Canonical company-admin console route (brief §3). Was /electro/app. */
export const ELECTRO_APP_BASE = "/electro/administracija";
export const ELECTRO_SUPERADMIN_BASE = "/electro/superadministracija";

/** System role keys seeded by bootstrap (brief §7). */
export const ELECTRO_ROLES = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  SITE_MANAGER: "SITE_MANAGER",
  ELECTRICIAN: "ELECTRICIAN",
} as const;
export type ElectroRoleKey = (typeof ELECTRO_ROLES)[keyof typeof ELECTRO_ROLES];

export const ELECTRO_ROLE_NAMES: Record<ElectroRoleKey, string> = {
  ADMIN: "Administrator",
  ENGINEER: "Inženjer",
  SITE_MANAGER: "Voditelj gradilišta",
  ELECTRICIAN: "Elektroinstalater",
};
