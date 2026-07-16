import type { BisneysActivityType } from "@/generated/prisma/client";

/**
 * Standardized comment prefixes (brief §26) let employees record calls,
 * follow-ups, pitches etc. directly from Trello. A comment that starts with a
 * known prefix is normalized to the matching CRM activity type.
 */
const PREFIX_MAP: { re: RegExp; type: BisneysActivityType }[] = [
  { re: /^\s*\[\s*poziv\s*\]/i, type: "CALL_LOGGED" },
  { re: /^\s*\[\s*follow[\s-]?up\s*\]/i, type: "FOLLOW_UP_CREATED" },
  { re: /^\s*\[\s*pitch\s*\]/i, type: "PITCH_PRESENTED" },
  { re: /^\s*\[\s*sastanak\s*\]/i, type: "MEETING_COMPLETED" },
  { re: /^\s*\[\s*odbijen\s*\]/i, type: "DEAL_LOST" },
  { re: /^\s*\[\s*zatvoreno\s*\]/i, type: "DEAL_WON" },
];

export function commentActivityType(text: string): BisneysActivityType {
  for (const { re, type } of PREFIX_MAP) if (re.test(text)) return type;
  return "COMMENT_ADDED";
}

/** True when a comment is a standardized call log ("[POZIV] …"). */
export function isCallComment(text: string): boolean {
  return /^\s*\[\s*poziv\s*\]/i.test(text);
}
