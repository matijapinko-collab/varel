import type { BisneysSalesStatus } from "@/generated/prisma/client";

/**
 * Default sales list → CRM status mapping (brief §19). Applied only as a
 * suggestion when a board is first imported; the authoritative mapping is
 * stored per Trello list ID on BisneysTrelloList.mappedStatus so it survives
 * list renames. Superadmin can override any mapping.
 */
const DEFAULT_BY_NAME: { match: RegExp; status: BisneysSalesStatus }[] = [
  { match: /guidelines/i, status: "INTERNAL_GUIDELINES" },
  { match: /new\s*compan/i, status: "NEW_COMPANY" },
  { match: /research/i, status: "RESEARCH" },
  { match: /new\s*lead/i, status: "NEW_LEAD" },
  { match: /qualif/i, status: "QUALIFICATION" },
  { match: /follow\s*up/i, status: "FOLLOW_UP" },
  { match: /pitch/i, status: "PITCH" },
  { match: /meeting/i, status: "MEETING" },
  { match: /nurture/i, status: "NURTURE" },
  { match: /negoti/i, status: "NEGOTIATE" },
  { match: /clos/i, status: "CLOSED" },
  { match: /lost/i, status: "LOST" },
  { match: /hold/i, status: "ON_HOLD" },
  { match: /archiv/i, status: "ARCHIVED" },
];

export function defaultStatusForListName(name: string): BisneysSalesStatus | null {
  for (const { match, status } of DEFAULT_BY_NAME) if (match.test(name)) return status;
  return null;
}

/** Croatian labels for the sales statuses (used in mapping UI + badges). */
export const SALES_STATUS_LABELS: Record<BisneysSalesStatus, string> = {
  INTERNAL_GUIDELINES: "Interne smjernice",
  NEW_COMPANY: "Nova tvrtka",
  RESEARCH: "Istraživanje",
  NEW_LEAD: "Novi lead",
  QUALIFICATION: "Kvalifikacija",
  FOLLOW_UP: "Follow up",
  PITCH: "Pitch",
  MEETING: "Sastanak",
  NURTURE: "Nurture",
  NEGOTIATE: "Pregovori",
  CLOSED: "Zatvoreno",
  LOST: "Izgubljeno",
  ARCHIVED: "Arhivirano",
  ON_HOLD: "Na čekanju",
};

export const SALES_STATUS_VALUES = Object.keys(SALES_STATUS_LABELS) as BisneysSalesStatus[];
