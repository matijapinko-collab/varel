import type { ElectroRoleKey } from "@/lib/electro/constants";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";

/**
 * App navigation (brief §75). Items are shown by role — an electrician never
 * sees the admin/financial modules they don't use. This is UX only; the real
 * control is the guard in each page and action. `roles: undefined` = everyone.
 * Modules with no page yet (Phase C+) are omitted until their pages land.
 */
export type ElectroNavItem = {
  label: string;
  href: string;
  roles?: ElectroRoleKey[];
};

export const ELECTRO_NAV: ElectroNavItem[] = [
  { label: "Dashboard", href: `${ELECTRO_APP_BASE}/dashboard` },
  { label: "Projekti", href: `${ELECTRO_APP_BASE}/projekti` },
  { label: "Zadaci", href: `${ELECTRO_APP_BASE}/zadaci` },
  { label: "Dokumenti", href: `${ELECTRO_APP_BASE}/dokumenti` },
  { label: "Fotografije", href: `${ELECTRO_APP_BASE}/fotografije` },
  { label: "Problemi", href: `${ELECTRO_APP_BASE}/problemi` },
  { label: "Dnevnik", href: `${ELECTRO_APP_BASE}/dnevnik`, roles: ["ADMIN", "ENGINEER", "SITE_MANAGER"] },
  { label: "Potrošnja", href: `${ELECTRO_APP_BASE}/potrosnja` },
  { label: "Materijali", href: `${ELECTRO_APP_BASE}/materijali` },
  { label: "Skladišta", href: `${ELECTRO_APP_BASE}/skladista`, roles: ["ADMIN"] },
  { label: "Izvještaji", href: `${ELECTRO_APP_BASE}/izvjestaji`, roles: ["ADMIN", "ENGINEER", "SITE_MANAGER"] },
  { label: "Investitori", href: `${ELECTRO_APP_BASE}/investitori`, roles: ["ADMIN", "ENGINEER"] },
  { label: "Pretraga", href: `${ELECTRO_APP_BASE}/pretraga` },
  { label: "Zaposlenici", href: `${ELECTRO_APP_BASE}/zaposlenici`, roles: ["ADMIN"] },
  { label: "Audit", href: `${ELECTRO_APP_BASE}/audit`, roles: ["ADMIN"] },
  { label: "Postavke", href: `${ELECTRO_APP_BASE}/postavke`, roles: ["ADMIN"] },
];

export function visibleNav(roles: ElectroRoleKey[]): ElectroNavItem[] {
  return ELECTRO_NAV.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
}
