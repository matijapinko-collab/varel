import type {
  ElectroTaskStatus,
  ElectroIssueStatus,
  ElectroDailyLogStatus,
} from "@/generated/prisma/client";

/**
 * Pure workflow helpers for tasks, issues and daily logs (brief §21, §33, §36).
 * Db-free and testable. The key invariants:
 *  - a task an electrician marks done goes to WAITING_FOR_REVIEW, never straight
 *    to COMPLETED (§21);
 *  - an issue can't jump OPEN→CLOSED without a recorded resolution (§36);
 *  - a locked daily log is immutable — amendments are separate revisions (§33).
 */

export const ELECTRO_TASK_STATUS_LABELS: Record<ElectroTaskStatus, string> = {
  OPEN: "Otvoren",
  ASSIGNED: "Dodijeljen",
  IN_PROGRESS: "U tijeku",
  WAITING_FOR_MATERIAL: "Čeka materijal",
  BLOCKED: "Blokiran",
  WAITING_FOR_REVIEW: "Čeka pregled",
  CHANGES_REQUIRED: "Potrebne izmjene",
  COMPLETED: "Završen",
  CANCELLED: "Otkazan",
};

export const ELECTRO_ISSUE_TYPE_LABELS: Record<string, string> = {
  TECHNICAL: "Tehnički problem",
  SAFETY: "Sigurnosni problem",
  MATERIAL_SHORTAGE: "Nedostatak materijala",
  DRAWING_ERROR: "Pogreška u nacrtu",
  EXECUTION_DEVIATION: "Odstupanje izvedbe",
  DELAY: "Kašnjenje",
  BLOCKER: "Blokada",
  INVESTOR_REQUEST: "Zahtjev investitora",
  COMPLAINT: "Reklamacija",
  QUALITY_DEFECT: "Kvalitativni nedostatak",
  COMMERCIAL_RISK: "Komercijalni rizik",
};

export const ELECTRO_ISSUE_STATUS_LABELS: Record<ElectroIssueStatus, string> = {
  OPEN: "Otvoren",
  ASSIGNED: "Dodijeljen",
  IN_PROGRESS: "U tijeku",
  WAITING_FOR_INFORMATION: "Čeka informaciju",
  WAITING_FOR_INVESTOR: "Čeka investitora",
  WAITING_FOR_MATERIAL: "Čeka materijal",
  RESOLVED: "Riješen",
  VERIFIED: "Provjeren",
  CLOSED: "Zatvoren",
  REJECTED: "Odbijen",
};

export const ELECTRO_DAILY_LOG_STATUS_LABELS: Record<ElectroDailyLogStatus, string> = {
  DRAFT: "Nacrt",
  SUBMITTED: "Predan",
  APPROVED: "Odobren",
  LOCKED: "Zaključan",
};

/** Statuses a task may move to from its current one. */
const TASK_TRANSITIONS: Record<ElectroTaskStatus, ElectroTaskStatus[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_MATERIAL", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_MATERIAL", "BLOCKED", "WAITING_FOR_REVIEW", "CANCELLED"],
  WAITING_FOR_MATERIAL: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  BLOCKED: ["IN_PROGRESS", "WAITING_FOR_MATERIAL", "CANCELLED"],
  WAITING_FOR_REVIEW: ["COMPLETED", "CHANGES_REQUIRED"],
  CHANGES_REQUIRED: ["IN_PROGRESS", "WAITING_FOR_REVIEW", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionTask(from: ElectroTaskStatus, to: ElectroTaskStatus): boolean {
  if (from === to) return true;
  return (TASK_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * A task can only reach COMPLETED via review (WAITING_FOR_REVIEW → COMPLETED).
 * An electrician marking work done sets WAITING_FOR_REVIEW, not COMPLETED (§21).
 */
export function taskCompletionRequiresReview(from: ElectroTaskStatus): boolean {
  return from !== "WAITING_FOR_REVIEW";
}

const ISSUE_TRANSITIONS: Record<ElectroIssueStatus, ElectroIssueStatus[]> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_INFORMATION", "WAITING_FOR_INVESTOR", "WAITING_FOR_MATERIAL", "REJECTED"],
  IN_PROGRESS: ["WAITING_FOR_INFORMATION", "WAITING_FOR_INVESTOR", "WAITING_FOR_MATERIAL", "RESOLVED", "REJECTED"],
  WAITING_FOR_INFORMATION: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  WAITING_FOR_INVESTOR: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  WAITING_FOR_MATERIAL: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  RESOLVED: ["VERIFIED", "IN_PROGRESS"],
  VERIFIED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  REJECTED: [],
};

export function canTransitionIssue(from: ElectroIssueStatus, to: ElectroIssueStatus): boolean {
  if (from === to) return true;
  return (ISSUE_TRANSITIONS[from] ?? []).includes(to);
}

/** Moving an issue to RESOLVED requires a recorded solution (brief §36). */
export function issueResolutionRequiresSolution(to: ElectroIssueStatus): boolean {
  return to === "RESOLVED";
}

/** A locked daily log can never be edited in place (brief §33). */
export function dailyLogIsEditable(status: ElectroDailyLogStatus): boolean {
  return status === "DRAFT" || status === "SUBMITTED";
}
