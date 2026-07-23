import type { ElectroRoleKey } from "@/lib/electro/constants";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";

/**
 * Company-admin console navigation (brief §6). Items render by role — an
 * electrician never sees the admin/financial modules they don't use. This is
 * UX only; the real control is the guard in each page and action.
 */
export type ElectroNavItem = {
  label: string;
  href: string;
  icon: string; // lucide icon name (resolved in the client sidebar)
  roles?: ElectroRoleKey[];
  /** Which dashboard-count key drives this item's badge, if any. */
  badge?: "lateTasks" | "docsPending" | "criticalIssues" | "lowStock" | "pendingConsumption";
};

export const ELECTRO_NAV: ElectroNavItem[] = [
  { label: "Dashboard", href: `${ELECTRO_APP_BASE}/dashboard`, icon: "LayoutDashboard" },
  { label: "Projekti", href: `${ELECTRO_APP_BASE}/projekti`, icon: "FolderKanban" },
  { label: "Gradilišta", href: `${ELECTRO_APP_BASE}/gradilista`, icon: "HardHat" },
  { label: "Zadaci", href: `${ELECTRO_APP_BASE}/zadaci`, icon: "ListChecks", badge: "lateTasks" },
  { label: "Dokumenti", href: `${ELECTRO_APP_BASE}/dokumenti`, icon: "FileText", badge: "docsPending" },
  { label: "Fotografije", href: `${ELECTRO_APP_BASE}/fotografije`, icon: "Camera" },
  { label: "Problemi", href: `${ELECTRO_APP_BASE}/problemi`, icon: "AlertTriangle", badge: "criticalIssues" },
  { label: "Investitori", href: `${ELECTRO_APP_BASE}/investitori`, icon: "Landmark", roles: ["ADMIN", "ENGINEER"] },
  { label: "Skladišta", href: `${ELECTRO_APP_BASE}/skladista`, icon: "Warehouse", roles: ["ADMIN"] },
  { label: "Materijali", href: `${ELECTRO_APP_BASE}/materijali`, icon: "Package", badge: "lowStock" },
  { label: "Potrošnja", href: `${ELECTRO_APP_BASE}/potrosnja`, icon: "PackageMinus", badge: "pendingConsumption" },
  { label: "Dnevnik", href: `${ELECTRO_APP_BASE}/dnevnik`, icon: "NotebookPen", roles: ["ADMIN", "ENGINEER", "SITE_MANAGER"] },
  { label: "Izvještaji", href: `${ELECTRO_APP_BASE}/izvjestaji`, icon: "BarChart3", roles: ["ADMIN", "ENGINEER", "SITE_MANAGER"] },
  { label: "Zaposlenici", href: `${ELECTRO_APP_BASE}/zaposlenici`, icon: "Users", roles: ["ADMIN"] },
  { label: "Integracije", href: `${ELECTRO_APP_BASE}/integracije`, icon: "Plug", roles: ["ADMIN"] },
  { label: "Postavke", href: `${ELECTRO_APP_BASE}/postavke`, icon: "Settings", roles: ["ADMIN"] },
];

export function visibleNav(roles: ElectroRoleKey[]): ElectroNavItem[] {
  return ELECTRO_NAV.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
}
