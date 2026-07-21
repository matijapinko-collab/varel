import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getSeo } from "@/lib/content";
import { getGuide } from "@/lib/guide-query";
import { buildSeoMetadata } from "@/lib/seo";
import { verifyPreviewToken } from "@/lib/preview-token";
import { PostArticle } from "@/components/content/post-article";
import { postPath } from "@/lib/post-url";

/**
 * A post under its primary category: /{locale}/{category}/{postSlug}.
 * The [slug] segment name is reused because Next.js forbids two differently
 * named dynamic segments at the same level (/[locale]/[slug] already exists).
 */

/** The category slug this post actually belongs to, in this locale. */
function categoryOf(guide: Awaited<ReturnType<typeof getGuide>>): string | null {
  const c = guide?.article.primaryCategory;
  if (!c) return null;
  return c.translations[0]?.slug || c.slug || null;
}

export async function generateMetadata(
  props: PageProps<"/[locale]/[slug]/[postSlug]">
): Promise<Metadata> {
  const { locale, postSlug } = await props.params;
  if (!isLocale(locale)) return {};
  const sp = await props.searchParams;
  const previewId = await verifyPreviewToken(typeof sp?.preview === "string" ? sp.preview : null);
  const guide = await getGuide(locale, postSlug, previewId);
  if (!guide) return {};
  if (previewId) return { title: `[SKICA] ${guide.title}`, robots: { index: false, follow: false } };

  const seo = await getSeo("ARTICLE", guide.articleId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: guide.title,
    fallbackDescription: guide.excerpt ?? undefined,
    locale,
    path: postPath(locale, guide.slug, categoryOf(guide)).replace(`/${locale}`, ""),
  });
}

export default async function CategoryPostPage(props: PageProps<"/[locale]/[slug]/[postSlug]">) {
  const { locale, slug, postSlug } = await props.params;
  if (!isLocale(locale)) notFound();

  const sp = await props.searchParams;
  const previewId = await verifyPreviewToken(typeof sp?.preview === "string" ? sp.preview : null);
  const guide = await getGuide(locale, postSlug, previewId);
  if (!guide) notFound();

  // Only the post's real category may serve it — anything else redirects to the
  // canonical URL so one post never lives at several addresses.
  const category = categoryOf(guide);
  const canonical = postPath(locale, guide.slug, category);
  if (category !== slug) permanentRedirect(canonical);

  return (
    <PostArticle guide={guide} locale={locale} isPreview={Boolean(previewId)} canonicalPath={canonical} />
  );
}
