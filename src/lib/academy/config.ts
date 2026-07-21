/**
 * Varel Academy — the vocabulary of the section.
 *
 * Everything here is a pair: a stable internal value that goes into the
 * database, and display labels that never do. Renaming "Početnik" to
 * "Za početnike" must stay a copy change, not a data migration.
 *
 * Read by the editor panel, the public article page, the library filters and
 * the search adapter, so this file is the one place a new format or business
 * stage gets added.
 */

export const ACADEMY_SECTION = "academy";

type Labels = { hr: string; en: string };

/** Content format. Drives the badge, the filters and the card presentation. */
export const ACADEMY_FORMATS = {
  lesson: { hr: "Lekcija", en: "Lesson" },
  "practical-guide": { hr: "Praktični vodič", en: "Practical Guide" },
  "in-depth-guide": { hr: "Detaljni vodič", en: "In-depth Guide" },
  checklist: { hr: "Checklista", en: "Checklist" },
  template: { hr: "Predložak", en: "Template" },
  "case-study": { hr: "Studija slučaja", en: "Case Study" },
  comparison: { hr: "Usporedba", en: "Comparison" },
  tutorial: { hr: "Tutorial", en: "Tutorial" },
  "business-tool": { hr: "Poslovni alat", en: "Business Tool" },
  series: { hr: "Serijal", en: "Series" },
  course: { hr: "Tečaj", en: "Course" },
} as const satisfies Record<string, Labels>;

export const ACADEMY_DIFFICULTIES = {
  beginner: { hr: "Početnik", en: "Beginner" },
  intermediate: { hr: "Srednja razina", en: "Intermediate" },
  advanced: { hr: "Napredno", en: "Advanced" },
} as const satisfies Record<string, Labels>;

/**
 * Where the reader's business is right now. A post may belong to several —
 * "how to price a service" fits both starting out and growing sales.
 */
export const ACADEMY_BUSINESS_STAGES = {
  idea: { hr: "Imam poslovnu ideju", en: "I Have a Business Idea" },
  starting: { hr: "Pokrećem poslovanje", en: "Starting a Business" },
  running: { hr: "Vodim malo poslovanje", en: "Running a Small Business" },
  "growing-sales": { hr: "Želim povećati prodaju", en: "Growing Sales" },
  automating: { hr: "Želim automatizirati posao", en: "Automating Operations" },
  "building-team": { hr: "Gradim tim", en: "Building a Team" },
  "digital-product": { hr: "Razvijam digitalni proizvod", en: "Developing a Digital Product" },
  scaling: { hr: "Širim poslovanje", en: "Scaling a Business" },
} as const satisfies Record<string, Labels>;

/** Reading-time buckets used by the library filter, in minutes. */
export const ACADEMY_READING_BUCKETS = {
  "under-5": { max: 5, hr: "Do 5 minuta", en: "Under 5 minutes" },
  "5-10": { min: 5, max: 10, hr: "5–10 minuta", en: "5–10 minutes" },
  "10-20": { min: 10, max: 20, hr: "10–20 minuta", en: "10–20 minutes" },
  "over-20": { min: 20, hr: "Više od 20 minuta", en: "Over 20 minutes" },
} as const satisfies Record<string, { min?: number; max?: number } & Labels>;

export type AcademyFormat = keyof typeof ACADEMY_FORMATS;
export type AcademyDifficulty = keyof typeof ACADEMY_DIFFICULTIES;
export type AcademyBusinessStage = keyof typeof ACADEMY_BUSINESS_STAGES;
export type AcademyReadingBucket = keyof typeof ACADEMY_READING_BUCKETS;

const label = (labels: Labels, locale: string) => (locale === "hr" ? labels.hr : labels.en);

export function formatLabel(value: string | null | undefined, locale: string): string | null {
  const v = ACADEMY_FORMATS[value as AcademyFormat];
  return v ? label(v, locale) : null;
}

export function difficultyLabel(value: string | null | undefined, locale: string): string | null {
  const v = ACADEMY_DIFFICULTIES[value as AcademyDifficulty];
  return v ? label(v, locale) : null;
}

export function businessStageLabel(value: string | null | undefined, locale: string): string | null {
  const v = ACADEMY_BUSINESS_STAGES[value as AcademyBusinessStage];
  return v ? label(v, locale) : null;
}

/** Option lists for admin selects and public filters. */
export function formatOptions(locale: string) {
  return entries(ACADEMY_FORMATS, locale);
}
export function difficultyOptions(locale: string) {
  return entries(ACADEMY_DIFFICULTIES, locale);
}
export function businessStageOptions(locale: string) {
  return entries(ACADEMY_BUSINESS_STAGES, locale);
}
export function readingBucketOptions(locale: string) {
  return entries(ACADEMY_READING_BUCKETS, locale);
}

function entries(map: Record<string, Labels>, locale: string) {
  return Object.entries(map).map(([value, labels]) => ({ value, label: label(labels, locale) }));
}

/** Validators — anything arriving from a form or a query string passes here. */
export const isAcademyFormat = (v: unknown): v is AcademyFormat =>
  typeof v === "string" && v in ACADEMY_FORMATS;
export const isAcademyDifficulty = (v: unknown): v is AcademyDifficulty =>
  typeof v === "string" && v in ACADEMY_DIFFICULTIES;
export const isAcademyBusinessStage = (v: unknown): v is AcademyBusinessStage =>
  typeof v === "string" && v in ACADEMY_BUSINESS_STAGES;

/** Keeps only values this build knows, so an old draft can't poison a filter. */
export function cleanStages(input: unknown): AcademyBusinessStage[] {
  return Array.isArray(input) ? input.filter(isAcademyBusinessStage) : [];
}

/**
 * The 15 Academy topics. Seeded as Category rows and referenced by id, so a
 * post keeps its primary category free for the "akademija" URL segment.
 * `key` is a stable seed identity — the slugs are what end up in the database.
 */
export const ACADEMY_TOPICS = [
  { key: "starting", hr: "Pokretanje poslovanja", en: "Starting a Business", hrSlug: "pokretanje-poslovanja", enSlug: "starting-a-business" },
  { key: "ai", hr: "Umjetna inteligencija", en: "Artificial Intelligence", hrSlug: "umjetna-inteligencija", enSlug: "artificial-intelligence" },
  { key: "tools", hr: "Digitalni alati", en: "Digital Tools", hrSlug: "digitalni-alati", enSlug: "digital-tools" },
  { key: "marketing", hr: "Marketing", en: "Marketing", hrSlug: "akademija-marketing", enSlug: "academy-marketing" },
  { key: "seo", hr: "SEO i sadržaj", en: "SEO and Content", hrSlug: "seo-i-sadrzaj", enSlug: "seo-and-content" },
  { key: "sales", hr: "Prodaja", en: "Sales", hrSlug: "akademija-prodaja", enSlug: "academy-sales" },
  { key: "automation", hr: "Automatizacija", en: "Automation", hrSlug: "akademija-automatizacija", enSlug: "academy-automation" },
  { key: "web", hr: "Web-stranice i webshopovi", en: "Websites and E-commerce", hrSlug: "web-stranice-i-webshopovi", enSlug: "websites-and-ecommerce" },
  { key: "productivity", hr: "Produktivnost", en: "Productivity", hrSlug: "akademija-produktivnost", enSlug: "academy-productivity" },
  { key: "pricing", hr: "Cijene i ponude", en: "Pricing and Proposals", hrSlug: "cijene-i-ponude", enSlug: "pricing-and-proposals" },
  { key: "customers", hr: "Upravljanje klijentima", en: "Customer Management", hrSlug: "upravljanje-klijentima", enSlug: "customer-management" },
  { key: "digital-product", hr: "Razvoj digitalnih proizvoda", en: "Digital Product Development", hrSlug: "razvoj-digitalnih-proizvoda", enSlug: "digital-product-development" },
  { key: "strategy", hr: "Poslovna strategija", en: "Business Strategy", hrSlug: "poslovna-strategija", enSlug: "business-strategy" },
  { key: "finance", hr: "Financije za poduzetnike", en: "Finance for Entrepreneurs", hrSlug: "financije-za-poduzetnike", enSlug: "finance-for-entrepreneurs" },
  { key: "team", hr: "Upravljanje timom", en: "Team Management", hrSlug: "upravljanje-timom", enSlug: "team-management" },
] as const;

/** The parent category whose slug becomes the URL segment for every post. */
export const ACADEMY_ROOT = {
  key: "academy-root",
  hr: "Akademija",
  en: "Academy",
  hrSlug: "akademija",
  enSlug: "academy",
} as const;
