import type {
  BisneysCandidateStatus, BisneysDealStatus, BisneysCallOutcome,
  BisneysMeetingStatus, BisneysNotificationPriority, BisneysActivityType, BisneysActivitySource,
} from "@/generated/prisma/client";

export const ACTIVITY_TYPE_LABELS: Record<BisneysActivityType, string> = {
  COMPANY_CREATED: "Nova tvrtka",
  COMPANY_UPDATED: "Ažuriranje tvrtke",
  LEAD_CREATED: "Novi lead",
  LEAD_UPDATED: "Ažuriranje leada",
  CALL_LOGGED: "Poziv",
  COMMENT_ADDED: "Komentar",
  FOLLOW_UP_CREATED: "Follow-up",
  FOLLOW_UP_COMPLETED: "Follow-up odrađen",
  PITCH_SENT: "Pitch poslan",
  PITCH_PRESENTED: "Pitch prezentiran",
  MEETING_SCHEDULED: "Sastanak zakazan",
  MEETING_COMPLETED: "Sastanak održan",
  DEAL_VALUE_CHANGED: "Promjena vrijednosti",
  DEAL_WON: "Posao dobiven",
  DEAL_LOST: "Posao izgubljen",
  CARD_MOVED: "Kartica premještena",
  CONTACT_ADDED: "Dodan kontakt",
  DUE_DATE_CHANGED: "Promjena roka",
  DOCUMENT_UPLOADED: "Dokument dodan",
  CANDIDATE_CREATED: "Novi kandidat",
  CANDIDATE_UPDATED: "Ažuriranje kandidata",
  CANDIDATE_STATUS_CHANGED: "Promjena statusa kandidata",
  RELATIONSHIP_ADDED: "Dodan odnos",
  RELATIONSHIP_REMOVED: "Uklonjen odnos",
};

export const ACTIVITY_SOURCE_LABELS: Record<BisneysActivitySource, string> = {
  TRELLO: "Trello",
  BISNEYS_CRM: "CRM",
  SYSTEM: "Sustav",
  IMPORT: "Uvoz",
};

/** Shared label maps + formatting for the CRM (Croatian UI, brief §60). */

export const CANDIDATE_STATUS_LABELS: Record<BisneysCandidateStatus, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  FIRST_CALL: "Prvi poziv",
  QUALIFIED: "Kvalificiran",
  SECOND_INTERVIEW: "Drugi intervju",
  READY_FOR_CLIENT: "Spreman za klijenta",
  SENT_TO_CLIENT: "Poslan klijentu",
  CLIENT_INTERVIEW: "Intervju kod klijenta",
  CLIENT_INTERESTED: "Klijent zainteresiran",
  OFFERED: "Ponuda poslana",
  HIRED: "Zaposlen",
  REJECTED: "Odbijen",
  CANDIDATE_DECLINED: "Odustao",
  ON_HOLD: "Na čekanju",
  UNREACHABLE: "Nedostupan",
};
export const CANDIDATE_STATUS_VALUES = Object.keys(CANDIDATE_STATUS_LABELS) as BisneysCandidateStatus[];

export const DEAL_STATUS_LABELS: Record<BisneysDealStatus, string> = {
  OPEN: "Otvoren",
  WON: "Dobiven",
  LOST: "Izgubljen",
};
export const DEAL_STATUS_VALUES = Object.keys(DEAL_STATUS_LABELS) as BisneysDealStatus[];

export const CALL_OUTCOME_LABELS: Record<BisneysCallOutcome, string> = {
  ANSWERED: "Javio se",
  NO_ANSWER: "Bez odgovora",
  CALL_BACK: "Nazvati ponovno",
  INTERESTED: "Zainteresiran",
  NOT_INTERESTED: "Nije zainteresiran",
  MEETING_BOOKED: "Dogovoren sastanak",
  WRONG_NUMBER: "Krivi broj",
  UNREACHABLE: "Nedostupan",
};

export const MEETING_STATUS_LABELS: Record<BisneysMeetingStatus, string> = {
  SCHEDULED: "Zakazan",
  COMPLETED: "Održan",
  CANCELLED: "Otkazan",
  NO_SHOW: "Nije se pojavio",
  RESCHEDULED: "Pomaknut",
};

export const PRIORITY_LABELS: Record<BisneysNotificationPriority, string> = {
  LOW: "Nizak",
  MEDIUM: "Srednji",
  HIGH: "Visok",
  CRITICAL: "Kritičan",
};

/** Tone classes for status badges (never colour-only — always has a label). */
export const STATUS_TONE: Record<string, string> = {
  // sales / generic
  NEW_COMPANY: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  NEW_LEAD: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  QUALIFICATION: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  FOLLOW_UP: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  PITCH: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  MEETING: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  NEGOTIATE: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  CLOSED: "bg-green-500/10 text-green-600 dark:text-green-400",
  WON: "bg-green-500/10 text-green-600 dark:text-green-400",
  HIRED: "bg-green-500/10 text-green-600 dark:text-green-400",
  LOST: "bg-red-500/10 text-red-600 dark:text-red-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  ON_HOLD: "bg-gray-500/10 text-gray-500",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
  OPEN: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

export function toneFor(status: string): string {
  return STATUS_TONE[status] ?? "bg-soft text-muted";
}

const EUR = new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function money(value: unknown, currency = "EUR"): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "object" && value && "toNumber" in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
  if (!isFinite(n)) return "—";
  if (currency === "EUR") return EUR.format(n);
  return `${new Intl.NumberFormat("hr-HR", { maximumFractionDigits: 0 }).format(n)} ${currency}`;
}

export function shortDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "numeric", year: "numeric" });
}

export function dateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("hr-HR", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
