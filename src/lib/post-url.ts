/**
 * Single source of truth for a post's public URL.
 *
 * Posts live under their primary category: /{locale}/{categorySlug}/{postSlug}
 * (e.g. /hr/ai-alati/najbolji-ai-paket-za-obrte). Posts without a category
 * fall back to the legacy /{locale}/guides/{postSlug} shape, which also stays
 * alive as a 301 source for older links.
 */

export const GUIDES_SEGMENT = "guides";

export function postPath(locale: string, postSlug: string, categorySlug?: string | null): string {
  const category = (categorySlug ?? "").trim();
  if (!category || category === GUIDES_SEGMENT) return `/${locale}/${GUIDES_SEGMENT}/${postSlug}`;
  return `/${locale}/${category}/${postSlug}`;
}

/**
 * Picks the category slug for a locale from a category's translations,
 * falling back to the canonical slug.
 */
export function categorySlugForLocale(
  category: { slug: string; translations?: { slug: string; languageId: string }[] } | null | undefined,
  languageId: string | null | undefined
): string | null {
  if (!category) return null;
  const tr = languageId ? category.translations?.find((t) => t.languageId === languageId) : undefined;
  return tr?.slug || category.slug || null;
}
