import type { InteractionType } from "./parse";

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  TRELLO_COMMENT: "Trello bilješka",
  OUTBOUND_CALL: "Izlazni poziv",
  INBOUND_CALL: "Dolazni poziv",
  EMAIL: "Email",
  MEETING_NOTE: "Sastanak",
  FOLLOW_UP: "Follow-up",
  PITCH: "Prezentacija / ponuda",
  CLIENT_FEEDBACK: "Povratna informacija",
  DEAL_NOTE: "Bilješka o dealu",
  GENERAL_NOTE: "Bilješka",
};

export const INTERACTION_TYPE_VALUES = Object.keys(INTERACTION_TYPE_LABELS) as InteractionType[];

/** Manual types a recruiter can log (Trello-only types excluded). */
export const MANUAL_INTERACTION_TYPES: InteractionType[] = [
  "GENERAL_NOTE", "OUTBOUND_CALL", "INBOUND_CALL", "EMAIL", "MEETING_NOTE", "FOLLOW_UP", "PITCH", "CLIENT_FEEDBACK", "DEAL_NOTE",
];

/** Filter presets shown as chips on the interactions timeline. */
export const INTERACTION_FILTERS: { key: string; label: string; types: InteractionType[] | null }[] = [
  { key: "all", label: "Sve", types: null },
  { key: "calls", label: "Pozivi", types: ["OUTBOUND_CALL", "INBOUND_CALL"] },
  { key: "comments", label: "Komentari", types: ["TRELLO_COMMENT", "GENERAL_NOTE"] },
  { key: "meetings", label: "Sastanci", types: ["MEETING_NOTE"] },
  { key: "emails", label: "Emailovi", types: ["EMAIL"] },
  { key: "followups", label: "Follow-upovi", types: ["FOLLOW_UP"] },
  { key: "deals", label: "Deal / feedback", types: ["DEAL_NOTE", "CLIENT_FEEDBACK", "PITCH"] },
];
