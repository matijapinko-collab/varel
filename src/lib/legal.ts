/**
 * Legal page routing config. Privacy & Cookie policies are authored in English
 * and Croatian only. Croatian uses localized slugs; every other locale uses the
 * English slug and shows the English content (with a note) as a fallback.
 */
export const LEGAL_PAGES = [
  { key: "privacy" as const, en: "privacy-policy", hr: "politika-privatnosti" },
  { key: "cookie" as const, en: "cookie-policy", hr: "politika-kolacica" },
];

export type LegalKey = (typeof LEGAL_PAGES)[number]["key"];

/** The slug to use in a given locale (hr → localized, everyone else → English). */
export function legalSlug(key: LegalKey, locale: string): string {
  const p = LEGAL_PAGES.find((l) => l.key === key)!;
  return locale === "hr" ? p.hr : p.en;
}

/** True if `slug` is one of the English legal slugs. */
export function isEnglishLegalSlug(slug: string): boolean {
  return LEGAL_PAGES.some((l) => l.en === slug);
}

/** True if `slug` is any known legal slug (English or Croatian). */
export function isLegalSlug(slug: string): boolean {
  return LEGAL_PAGES.some((l) => l.en === slug || l.hr === slug);
}
