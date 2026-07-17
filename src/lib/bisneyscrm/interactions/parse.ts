/**
 * Interaction parser (Company Intelligence Faza 1). Classifies a free-text
 * comment (e.g. a Trello comment like "CC OUTBOUND CALL to Tihomir Stricevic")
 * into a normalized interaction type + contact name + confidence. Pure and
 * dependency-free so it is unit-testable. It NEVER mutates the original text —
 * callers keep rawContent verbatim and store this interpretation alongside.
 */

export type InteractionType =
  | "TRELLO_COMMENT" | "OUTBOUND_CALL" | "INBOUND_CALL" | "EMAIL" | "MEETING_NOTE"
  | "FOLLOW_UP" | "PITCH" | "CLIENT_FEEDBACK" | "DEAL_NOTE" | "GENERAL_NOTE";

export type ParsedInteraction = {
  type: InteractionType;
  contactName: string | null;
  confidence: number; // 0..1
  needsReview: boolean;
};

/** Ordered rules — most specific first. `strong` marks high-confidence keywords. */
const RULES: { re: RegExp; type: InteractionType; strong: boolean }[] = [
  { re: /\boutbound\s+call\b|\bizlazni\s+poziv\b|\bnazvali?\s+smo\b/i, type: "OUTBOUND_CALL", strong: true },
  { re: /\binbound\s+call\b|\bdolazni\s+poziv\b|\bnazvao\s+(?:nas|me)\b|\bjavio\s+se\b/i, type: "INBOUND_CALL", strong: true },
  { re: /\bfollow[\s-]?up\b|\bfollowup\b/i, type: "FOLLOW_UP", strong: true },
  { re: /\bmeeting\b|\bsastanak\b|\bsastali\s+smo\b|\bsastanku\b/i, type: "MEETING_NOTE", strong: true },
  { re: /\be-?mail\b|\bposlao\s+mail\b|\bmailom\b/i, type: "EMAIL", strong: true },
  { re: /\bclient\s+feedback\b|\bpovratna\s+informacija\b|\bfeedback\b/i, type: "CLIENT_FEEDBACK", strong: true },
  { re: /\bpitch\b|\bprezentac/i, type: "PITCH", strong: true },
  { re: /\bdeal\b|\bponud[au]\b|\bugovor\b/i, type: "DEAL_NOTE", strong: false },
  { re: /\bcall\b|\bpoziv\b|\bzvao\b/i, type: "OUTBOUND_CALL", strong: false },
];

// Capture up to three capitalised (incl. Croatian diacritics) name tokens after a
// linking preposition: "to/with/s/sa/za/prema <Name>".
const NAME_RE =
  /(?:\bto\b|\bwith\b|\bs\b|\bsa\b|\bza\b|\bprema\b|\bkod\b)\s+([A-ZČĆŠĐŽ][\p{L}.'-]+(?:\s+[A-ZČĆŠĐŽ][\p{L}.'-]+){0,2})/u;

export function extractContactName(raw: string): string | null {
  const m = raw.match(NAME_RE);
  if (!m) return null;
  // Trim trailing punctuation/noise.
  return m[1].replace(/[.,;:–—-]+$/, "").trim() || null;
}

export function parseInteraction(raw: string, fallbackType: InteractionType = "GENERAL_NOTE"): ParsedInteraction {
  const text = (raw ?? "").trim();
  if (!text) return { type: fallbackType, contactName: null, confidence: 0, needsReview: false };

  const rule = RULES.find((r) => r.re.test(text));
  const contactName = extractContactName(text);

  if (!rule) {
    // Nothing recognised — keep it as the fallback (a plain comment/note).
    return { type: fallbackType, contactName, confidence: contactName ? 0.4 : 0.2, needsReview: false };
  }

  // Confidence: strong keyword + a name is the clearest signal.
  let confidence = rule.strong ? 0.7 : 0.5;
  if (contactName) confidence += 0.2;
  confidence = Math.min(1, confidence);
  const needsReview = confidence < 0.55;

  // Low-confidence classifications fall back to a plain comment so we never
  // mislabel; the interpreted type is still available for review.
  const type = needsReview ? fallbackType : rule.type;
  return { type, contactName, confidence, needsReview };
}
