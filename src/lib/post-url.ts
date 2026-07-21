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
 * Prisma select/include fragment holding exactly what a post link needs.
 * Drop it into any `article` select so internal links point straight at the
 * canonical URL instead of bouncing through a 301.
 */
export const postCategorySelect = {
  primaryCategory: {
    select: { slug: true, translations: { select: { slug: true, languageId: true } } },
  },
} as const;

type ArticleWithCategory = {
  primaryCategory?: { slug: string; translations: { slug: string; languageId: string }[] } | null;
};

/** postPath() for an article fetched with postCategorySelect. */
export function postPathFor(
  locale: string,
  postSlug: string,
  article: ArticleWithCategory | null | undefined,
  languageId?: string | null
): string {
  return postPath(locale, postSlug, categorySlugForLocale(article?.primaryCategory, languageId));
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
