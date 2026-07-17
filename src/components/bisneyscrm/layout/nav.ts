import { BISNEYS_BASE } from "@/lib/bisneyscrm/constants";

/** Left navigation (brief §13). `superadminOnly` items are also enforced server-side. */
export type BisneysNavItem = {
  href: string;
  label: string;
  icon: string;
  superadminOnly?: boolean;
  badge?: "notifications";
};

export const BISNEYS_NAV: BisneysNavItem[] = [
  { href: `${BISNEYS_BASE}/dashboard`, label: "Pregled", icon: "dashboard" },
  { href: `${BISNEYS_BASE}/sales`, label: "Sales", icon: "trending" },
  { href: `${BISNEYS_BASE}/delivery`, label: "Delivery", icon: "truck" },
  { href: `${BISNEYS_BASE}/activities`, label: "Aktivnosti", icon: "activity" },
  { href: `${BISNEYS_BASE}/companies`, label: "Tvrtke", icon: "building" },
  { href: `${BISNEYS_BASE}/contacts`, label: "Kontakti", icon: "contact" },
  { href: `${BISNEYS_BASE}/candidates`, label: "Kandidati", icon: "users" },
  { href: `${BISNEYS_BASE}/jobs`, label: "Poslovi", icon: "briefcase" },
  { href: `${BISNEYS_BASE}/professions`, label: "Zanimanja", icon: "layers" },
  { href: `${BISNEYS_BASE}/assessments`, label: "Procjene", icon: "clipboard" },
  { href: `${BISNEYS_BASE}/talent-pools`, label: "Talent pools", icon: "star" },
  { href: `${BISNEYS_BASE}/people`, label: "Osobe i odnosi", icon: "network" },
  { href: `${BISNEYS_BASE}/services`, label: "Usluge", icon: "layers" },
  { href: `${BISNEYS_BASE}/finance`, label: "Financije", icon: "euro" },
  { href: `${BISNEYS_BASE}/notifications`, label: "Obavijesti", icon: "bell", badge: "notifications" },
  { href: `${BISNEYS_BASE}/reports`, label: "Izvještaji", icon: "chart" },
  { href: `${BISNEYS_BASE}/data-quality`, label: "Kvaliteta podataka", icon: "shield" },
  { href: `${BISNEYS_BASE}/settings`, label: "Postavke", icon: "settings" },
  { href: `${BISNEYS_BASE}/users`, label: "Korisnici", icon: "userCog", superadminOnly: true },
  { href: `${BISNEYS_BASE}/settings/trello`, label: "Trello integracija", icon: "trello", superadminOnly: true },
  { href: `${BISNEYS_BASE}/audit-log`, label: "Audit log", icon: "scroll", superadminOnly: true },
  { href: `${BISNEYS_BASE}/settings/system`, label: "Sistemske postavke", icon: "sliders", superadminOnly: true },
];
