import { normalizeEmail, normalizePhone } from "@/lib/bisneyscrm/forms";

/**
 * Trello candidate parser (Faza 7). Extracts structured candidate fields from
 * a Trello card's title, description and labels. Recruiters commonly encode
 * "Ime Prezime — 09x xxx — email" in the title and free text in the body;
 * this pulls out email, phone, name and a profession hint, and turns labels
 * into tags + an optional profession/status via a label map.
 */

export type LabelMapEntry = { professionId?: string; professionName?: string; status?: string; tag?: string };
export type CandidateLabelMap = Record<string, LabelMapEntry>;

export type ParsedCandidate = {
  fullName: string;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  professionHint: string | null;
  professionId: string | null;
  status: string | null;
  tags: string[];
  notes: string | null;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Croatian mobile/landline, tolerant of spaces, dashes, parentheses, +385/00385/0.
const PHONE_RE = /(?:(?:\+|00)385|0)\s*\(?\d{1,3}\)?[\s./-]*\d{3}[\s./-]*\d{3,4}/;

function stripContacts(text: string): string {
  return text.replace(EMAIL_RE, " ").replace(PHONE_RE, " ").replace(/[—–|]/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Extracts a plausible person name from the first line / title. */
function extractName(title: string): string {
  const firstSegment = title.split(/[—–|,\n]/)[0] ?? title;
  const cleaned = stripContacts(firstSegment).replace(/[^\p{L}\s.'-]/gu, " ").replace(/\s{2,}/g, " ").trim();
  // Keep at most the first 4 tokens (Ime [Srednje] Prezime).
  return cleaned.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}

export function parseCandidateFromCard(
  card: { name: string; desc?: string | null; labels?: string[] },
  labelMap: CandidateLabelMap = {},
): ParsedCandidate {
  const haystack = `${card.name}\n${card.desc ?? ""}`;
  const email = (haystack.match(EMAIL_RE)?.[0] ?? "").trim() || null;
  const phoneRaw = (haystack.match(PHONE_RE)?.[0] ?? "").trim() || null;
  const fullName = extractName(card.name) || card.name.trim();

  const tags: string[] = [];
  let professionId: string | null = null;
  let professionHint: string | null = null;
  let status: string | null = null;
  for (const label of card.labels ?? []) {
    const entry = labelMap[label] ?? labelMap[label.toLowerCase()];
    if (entry?.professionId) professionId = entry.professionId;
    if (entry?.professionName) professionHint = entry.professionName;
    if (entry?.status) status = entry.status;
    tags.push(entry?.tag || label);
  }

  return {
    fullName,
    email,
    normalizedEmail: normalizeEmail(email),
    phone: phoneRaw,
    normalizedPhone: normalizePhone(phoneRaw),
    professionHint,
    professionId,
    status,
    tags: Array.from(new Set(tags.filter(Boolean))),
    notes: card.desc?.trim() || null,
  };
}
