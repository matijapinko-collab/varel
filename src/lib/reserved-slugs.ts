/**
 * Path segments that a file-system route under /[locale]/ already owns.
 *
 * These matter because Next.js resolves a static segment before a dynamic one,
 * per level, and static folders are locale-blind. Two silent failures follow:
 *
 *   - A CATEGORY with one of these slugs makes postPath() generate
 *     /{locale}/{segment}/{postSlug}, which the static route swallows. Every
 *     post in that category 404s while its canonical URL, breadcrumb and
 *     JSON-LD still point there. Nothing fails at build time.
 *   - A CMS PAGE with one of these slugs is simply unreachable — the static
 *     route wins over /[locale]/[slug].
 *
 * Keep this list in sync with the folders in src/app/[locale]/.
 *
 * Note what is deliberately NOT here: "akademija" and "academy". The Academy
 * has no static folder — its landing page is a CMS page at /{locale}/akademija
 * and its posts sit one level deeper at /{locale}/akademija/{postSlug}. Those
 * are different route levels, so they coexist. Adding a static folder for the
 * Academy later would reintroduce exactly the bug this file exists to prevent.
 */

export const RESERVED_ROUTE_SEGMENTS = [
  "ai-tool-finder",
  "authors",
  "autori",
  "best-deals",
  "categories",
  "compare",
  "deals",
  "editorial",
  "guides",
  "news",
  "prompts",
  "report",
  "search",
  "tools",
  "varel-tools",
] as const;

const RESERVED = new Set<string>(RESERVED_ROUTE_SEGMENTS);

export function isReservedSegment(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

/**
 * Throws when a slug would be shadowed by a route. Call it on every path that
 * writes a category or page slug — the failure it prevents is invisible in
 * testing and only shows up as 404s on live posts.
 */
export function assertUsableSlug(slug: string, kind: "kategorija" | "stranica"): void {
  if (!isReservedSegment(slug)) return;
  throw new Error(
    `Slug "${slug}" je rezerviran za rutu i ne može se koristiti za ${kind}. ` +
      `Odaberite drugi slug — inače bi ta adresa vodila na postojeću sekciju, a ne na vaš sadržaj.`
  );
}
