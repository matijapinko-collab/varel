import type {
  HvacPlan, HvacContractTerm, HvacRole, HvacAppointmentStatus, HvacWorkOrderStatus,
  HvacInvoiceStatus, HvacQuoteStatus, HvacReminderStatus, HvacInquiryStatus,
  HvacUnitStatus, HvacPriority, HvacSource, HvacCustomerType, HvacUnitType,
} from "@/generated/prisma/client";
import { hvacPricing } from "./content";

/**
 * Central Croatian configuration + status system for the Varel HVAC B2B app.
 * Single source of truth: labels, package limits, pricing and status tones are
 * defined here (not duplicated across components). English can be layered on
 * later without touching the UI.
 */

/* ---------------- packages ---------------- */

/**
 * Package limits + monthly price (no long-term contract). These are the
 * defaults; the superadministration will be able to override them per package.
 */
export const PLAN_CONFIG: Record<HvacPlan, {
  name: string;
  includedUsers: number;
  storageGb: number;
  monthlyPriceEur: number;
}> = {
  START: { name: "Varel Start", includedUsers: 1, storageGb: 5, monthlyPriceEur: hvacPricing.start.monthly },
  TEAM: { name: "Varel Team", includedUsers: 5, storageGb: 25, monthlyPriceEur: hvacPricing.team.monthly },
  BUSINESS: { name: "Varel Business", includedUsers: 15, storageGb: 100, monthlyPriceEur: hvacPricing.business.monthly },
};

/** Each user above the package limit. */
export const EXTRA_USER_EUR = 12;

export const CONTRACT_TERM_LABELS: Record<HvacContractTerm, string> = {
  MONTHLY: "Bez ugovorne obveze",
  ANNUAL12: "Ugovor na 12 mjeseci",
  ANNUAL24: "Ugovor na 24 mjeseca",
};

export const TENANT_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Probno razdoblje",
  PENDING_ACTIVATION: "Čeka aktivaciju",
  ACTIVE: "Aktivno",
  OVERDUE: "Dospjelo",
  SUSPENDED: "Suspendirano",
  CANCELLED: "Otkazano",
};

/* ---------------- roles ---------------- */

export const ROLE_LABELS: Record<HvacRole, string> = {
  OWNER: "Vlasnik",
  ADMINISTRATOR: "Administrator",
  DISPATCHER: "Dispečer",
  TECHNICIAN: "Majstor",
  ACCOUNTANT: "Računovodstvo (samo pregled)",
};

/* ---------------- status system ---------------- */

export type StatusTone = "neutral" | "info" | "progress" | "warn" | "success" | "danger" | "muted";

/** Tailwind classes per tone. Never communicates via colour alone — always paired with a label. */
export const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  progress: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  danger: "bg-red-500/10 text-red-600 dark:text-red-300",
  muted: "bg-slate-400/10 text-slate-500 dark:text-slate-400",
};

type StatusDef = { label: string; tone: StatusTone };

export const APPOINTMENT_STATUS: Record<HvacAppointmentStatus, StatusDef> = {
  NEW_INQUIRY: { label: "Novi upit", tone: "neutral" },
  WAITING_CONFIRMATION: { label: "Čeka potvrdu", tone: "warn" },
  CONFIRMED: { label: "Potvrđeno", tone: "info" },
  TECH_ASSIGNED: { label: "Majstor dodijeljen", tone: "info" },
  TECH_EN_ROUTE: { label: "Majstor na putu", tone: "warn" },
  IN_PROGRESS: { label: "U tijeku", tone: "progress" },
  COMPLETED: { label: "Završeno", tone: "success" },
  WAITING_PARTS: { label: "Čeka dijelove", tone: "muted" },
  POSTPONED: { label: "Odgođeno", tone: "muted" },
  CANCELLED: { label: "Otkazano", tone: "danger" },
  NO_SHOW: { label: "Klijent se nije pojavio", tone: "danger" },
};

export const WORK_ORDER_STATUS: Record<HvacWorkOrderStatus, StatusDef> = {
  DRAFT: { label: "Nacrt", tone: "neutral" },
  SCHEDULED: { label: "Zakazano", tone: "info" },
  EN_ROUTE: { label: "Na putu", tone: "warn" },
  IN_PROGRESS: { label: "U tijeku", tone: "progress" },
  PAUSED: { label: "Pauzirano", tone: "muted" },
  WAITING_PARTS: { label: "Čeka dijelove", tone: "muted" },
  COMPLETED: { label: "Završeno", tone: "success" },
  SENT: { label: "Poslano klijentu", tone: "success" },
  CANCELLED: { label: "Otkazano", tone: "danger" },
};

export const INVOICE_STATUS: Record<HvacInvoiceStatus, StatusDef> = {
  DRAFT: { label: "Nacrt", tone: "neutral" },
  ISSUED: { label: "Izdano", tone: "info" },
  PARTIALLY_PAID: { label: "Djelomično plaćeno", tone: "warn" },
  PAID: { label: "Plaćeno", tone: "success" },
  OVERDUE: { label: "Dospjelo", tone: "danger" },
  CANCELLED: { label: "Otkazano", tone: "muted" },
};

export const QUOTE_STATUS: Record<HvacQuoteStatus, StatusDef> = {
  DRAFT: { label: "Nacrt", tone: "neutral" },
  SENT: { label: "Poslano", tone: "info" },
  VIEWED: { label: "Pregledano", tone: "progress" },
  ACCEPTED: { label: "Prihvaćeno", tone: "success" },
  REJECTED: { label: "Odbijeno", tone: "danger" },
  EXPIRED: { label: "Isteklo", tone: "muted" },
  CONVERTED_WORKORDER: { label: "Pretvoreno u radni nalog", tone: "success" },
  CONVERTED_INVOICE: { label: "Pretvoreno u račun", tone: "success" },
};

export const REMINDER_STATUS: Record<HvacReminderStatus, StatusDef> = {
  FUTURE: { label: "Budući", tone: "neutral" },
  UPCOMING: { label: "Uskoro", tone: "warn" },
  READY: { label: "Spremno za kontakt", tone: "info" },
  CONTACTED: { label: "Klijent kontaktiran", tone: "progress" },
  BOOKED: { label: "Termin rezerviran", tone: "success" },
  POSTPONED: { label: "Odgođeno", tone: "muted" },
  REJECTED: { label: "Odbijeno", tone: "danger" },
  COMPLETED: { label: "Završeno", tone: "success" },
};

export const INQUIRY_STATUS: Record<HvacInquiryStatus, StatusDef> = {
  NEW: { label: "Novo", tone: "neutral" },
  CONTACTED: { label: "Kontaktirano", tone: "info" },
  WAITING_INFO: { label: "Čeka podatke", tone: "warn" },
  WAITING_APPOINTMENT: { label: "Čeka termin", tone: "warn" },
  SCHEDULED: { label: "Termin dogovoren", tone: "success" },
  REJECTED: { label: "Odbijeno", tone: "danger" },
  CLOSED: { label: "Zatvoreno", tone: "muted" },
};

export const UNIT_STATUS: Record<HvacUnitStatus, StatusDef> = {
  ACTIVE: { label: "Aktivan", tone: "success" },
  TEMPORARILY_INACTIVE: { label: "Privremeno neaktivan", tone: "muted" },
  REMOVED: { label: "Uklonjen", tone: "muted" },
  REPLACED: { label: "Zamijenjen", tone: "muted" },
  UNDER_REPAIR: { label: "U popravku", tone: "warn" },
  ARCHIVED: { label: "Arhiviran", tone: "muted" },
};

export const PRIORITY: Record<HvacPriority, StatusDef> = {
  LOW: { label: "Nisko", tone: "muted" },
  NORMAL: { label: "Normalno", tone: "neutral" },
  HIGH: { label: "Visoko", tone: "warn" },
  URGENT: { label: "Hitno", tone: "danger" },
};

/* ---------------- customers / units labels ---------------- */

export const SOURCE_LABELS: Record<HvacSource, string> = {
  HOSTED_BOOKING: "Varel booking",
  PHONE: "Telefon",
  EMAIL: "E-mail",
  WEBSITE: "Web-stranica",
  SOCIAL: "Društvene mreže",
  RECOMMENDATION: "Preporuka",
  EXISTING_CUSTOMER: "Postojeći klijent",
  MANUAL: "Ručni unos",
  OTHER: "Ostalo",
};

export const CUSTOMER_TYPE_LABELS: Record<HvacCustomerType, string> = {
  INDIVIDUAL: "Fizička osoba",
  COMPANY: "Tvrtka",
};

export const UNIT_TYPE_LABELS: Record<HvacUnitType, string> = {
  SPLIT: "Split",
  MULTI_SPLIT: "Multi-split",
  PORTABLE: "Prijenosni",
  CASSETTE: "Kazetni",
  DUCTED: "Kanalni",
  FLOOR: "Podni",
  ROOFTOP: "Krovni",
  HEAT_PUMP: "Dizalica topline",
  OTHER: "Ostalo",
};

/** Human name for a customer (individual or company). */
export function customerDisplayName(c: { type: HvacCustomerType; firstName?: string | null; lastName?: string | null; companyName?: string | null }): string {
  if (c.type === "COMPANY") return c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Tvrtka";
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || "Klijent";
}

/* ---------------- default services (onboarding) ---------------- */

export const DEFAULT_SERVICES: { name: string; durationMin: number }[] = [
  { name: "Redovni servis", durationMin: 60 },
  { name: "Dubinsko čišćenje", durationMin: 90 },
  { name: "Dezinfekcija", durationMin: 45 },
  { name: "Dijagnostika", durationMin: 45 },
  { name: "Popravak", durationMin: 90 },
  { name: "Montaža", durationMin: 180 },
  { name: "Demontaža", durationMin: 90 },
  { name: "Premještanje uređaja", durationMin: 180 },
  { name: "Punjenje rashladnog sredstva", durationMin: 60 },
  { name: "Hitna intervencija", durationMin: 60 },
  { name: "Savjetovanje", durationMin: 30 },
  { name: "Ponuda za novi uređaj", durationMin: 30 },
];

/* ---------------- B2B navigation ---------------- */

export const B2B_NAV: { href: string; label: string; icon: string }[] = [
  { href: "/hvac-b2b/nadzorna-ploca", label: "Nadzorna ploča", icon: "dashboard" },
  { href: "/hvac-b2b/danas", label: "Danas", icon: "today" },
  { href: "/hvac-b2b/kalendar", label: "Kalendar", icon: "calendar" },
  { href: "/hvac-b2b/upiti", label: "Upiti", icon: "inbox" },
  { href: "/hvac-b2b/klijenti", label: "Klijenti", icon: "users" },
  { href: "/hvac-b2b/lokacije", label: "Lokacije", icon: "map" },
  { href: "/hvac-b2b/uredaji", label: "Klima-uređaji", icon: "airvent" },
  { href: "/hvac-b2b/radni-nalozi", label: "Radni nalozi", icon: "clipboard" },
  { href: "/hvac-b2b/ponude", label: "Ponude", icon: "quote" },
  { href: "/hvac-b2b/racuni", label: "Računi", icon: "receipt" },
  { href: "/hvac-b2b/majstori", label: "Majstori", icon: "wrench" },
  { href: "/hvac-b2b/servisni-podsjetnici", label: "Servisni podsjetnici", icon: "bell" },
  { href: "/hvac-b2b/izvjestaji", label: "Izvještaji", icon: "chart" },
  { href: "/hvac-b2b/postavke", label: "Postavke", icon: "settings" },
];
