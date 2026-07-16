import type { ElectroProjectStatus } from "@/generated/prisma/client";

/**
 * Project status model (brief §17). Pure + db-free so transition rules are
 * unit-testable. Certain transitions require a reason; the backend is the
 * source of truth (the UI only mirrors these rules).
 */

export const ELECTRO_PROJECT_STATUS_LABELS: Record<ElectroProjectStatus, string> = {
  DRAFT: "Nacrt",
  OFFER: "Ponuda",
  APPROVED: "Odobreno",
  PREPARATION: "Priprema",
  ACTIVE: "Aktivan",
  ON_HOLD: "Na čekanju",
  WAITING_FOR_INVESTOR: "Čeka investitora",
  TECHNICAL_REVIEW: "Tehnički pregled",
  COMPLETED: "Završen",
  CANCELLED: "Otkazan",
  ARCHIVED: "Arhiviran",
};

export const ELECTRO_PROJECT_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
  CRITICAL: "Kritičan",
};

/** Transitions that must carry a reason (brief §17). */
const REASON_REQUIRED: Array<[ElectroProjectStatus, ElectroProjectStatus]> = [
  ["ACTIVE", "ON_HOLD"],
  ["ACTIVE", "CANCELLED"],
  ["ACTIVE", "WAITING_FOR_INVESTOR"],
];

export function transitionRequiresReason(
  from: ElectroProjectStatus,
  to: ElectroProjectStatus
): boolean {
  return REASON_REQUIRED.some(([f, t]) => f === from && t === to);
}

/**
 * Allowed next statuses from a given status. A deliberately permissive graph
 * (electrical projects don't always move linearly) that still blocks obvious
 * nonsense like leaving a terminal ARCHIVED state through normal edits.
 */
const TRANSITIONS: Record<ElectroProjectStatus, ElectroProjectStatus[]> = {
  DRAFT: ["OFFER", "APPROVED", "CANCELLED", "ARCHIVED"],
  OFFER: ["APPROVED", "DRAFT", "CANCELLED", "ARCHIVED"],
  APPROVED: ["PREPARATION", "ACTIVE", "CANCELLED", "ARCHIVED"],
  PREPARATION: ["ACTIVE", "ON_HOLD", "CANCELLED", "ARCHIVED"],
  ACTIVE: ["ON_HOLD", "WAITING_FOR_INVESTOR", "TECHNICAL_REVIEW", "CANCELLED"],
  ON_HOLD: ["ACTIVE", "CANCELLED", "ARCHIVED"],
  WAITING_FOR_INVESTOR: ["ACTIVE", "ON_HOLD", "CANCELLED"],
  TECHNICAL_REVIEW: ["ACTIVE", "COMPLETED"],
  COMPLETED: ["ARCHIVED", "ACTIVE"],
  CANCELLED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
};

export function canTransition(from: ElectroProjectStatus, to: ElectroProjectStatus): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Clamp a user-supplied percentage into 0–100. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
