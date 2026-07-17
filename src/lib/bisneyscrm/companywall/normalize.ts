/**
 * CompanyWall name/OIB matching helpers (Company Intelligence Faza 3). Pure and
 * dependency-free so they are unit-testable. Normalization is deliberately
 * conservative — it must never merge two genuinely different companies just
 * because their names look similar (brief §10).
 */

// Letter sequences of legal forms after dots are removed (d.o.o. → doo).
const LEGAL_FORMS = new Set(["jdoo", "doo", "dd", "obrt", "jtd", "kd", "gmbh", "ltd", "inc", "llc", "sp"]);

/** Lowercases, strips diacritics, legal forms, punctuation and extra spaces. */
export function normalizeCompanyName(name: string): string {
  let n = (name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  n = n.replace(/\./g, "");                    // d.o.o. → doo (collapse dotted legal forms)
  n = n.replace(/[^a-z0-9]+/g, " ").trim();     // remaining punctuation → space
  return n.split(" ").filter((t) => t && !LEGAL_FORMS.has(t)).join(" ");
}

/** Croatian OIB = exactly 11 digits. Returns null if it doesn't look like one. */
export function normalizeOib(oib: string | null | undefined): string | null {
  const d = (oib ?? "").replace(/\D/g, "");
  return d.length === 11 ? d : null;
}

/** ISO 7064 MOD 11,10 checksum used by the Croatian OIB. */
export function isValidOib(oib: string | null | undefined): boolean {
  const n = normalizeOib(oib);
  if (!n) return false;
  let rem = 10;
  for (let i = 0; i < 10; i++) {
    rem = (Number(n[i]) + rem) % 10 || 10;
    rem = (rem * 2) % 11;
  }
  const check = (11 - rem) % 10;
  return check === Number(n[10]);
}

/** 0..1 similarity of two company names after normalization (token Jaccard). */
export function companyNameMatchScore(a: string, b: string): number {
  const na = normalizeCompanyName(a), nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" ")), tb = new Set(nb.split(" "));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return union ? inter / union : 0;
}

/**
 * Classifies a candidate match. OIB equality is authoritative; otherwise a high
 * name score is a strong (but confirm-required) match, mid is ambiguous.
 */
export function classifyMatch(input: { oibA?: string | null; oibB?: string | null; nameA: string; nameB: string }): {
  confidence: number; method: "oib" | "exact_name" | "fuzzy_name" | "none"; needsConfirm: boolean;
} {
  const oa = normalizeOib(input.oibA), ob = normalizeOib(input.oibB);
  if (oa && ob && oa === ob) return { confidence: 1, method: "oib", needsConfirm: false };
  const score = companyNameMatchScore(input.nameA, input.nameB);
  if (score >= 1) return { confidence: 0.9, method: "exact_name", needsConfirm: true };
  if (score >= 0.6) return { confidence: score, method: "fuzzy_name", needsConfirm: true };
  return { confidence: score, method: "none", needsConfirm: true };
}
