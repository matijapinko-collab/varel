import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPageBySlug, getSeo } from "@/lib/content";
import { isEnglishLegalSlug, legalSlug, LEGAL_PAGES } from "@/lib/legal";
import {
  BlockRenderer,
  type BlockData,
} from "@/components/blocks/block-renderer";
import { buildSeoMetadata } from "@/lib/seo";

/**
 * Catch-all CMS page route: any page created in the page builder
 * (about, contact, legal pages, landing pages…) renders here.
 *
 * Legal fallback: Privacy & Cookie policies are authored in EN + HR only.
 * For any other locale, we serve the English page content with a note. If an
 * English legal slug is requested on /hr, we redirect to the Croatian slug.
 */

/** Resolve which page to render for this locale+slug, plus whether it's an EN fallback. */
async function resolveLegalPage(locale: Locale, slug: string) {
  const page = await getPageBySlug(locale, slug);
  if (page) return { page, englishFallback: false, seoLocale: locale };

  // Non-EN/HR locale requesting an English legal slug → show English content.
  if (locale !== "en" && locale !== "hr" && isEnglishLegalSlug(slug)) {
    const enPage = await getPageBySlug("en", slug);
    if (enPage) return { page: enPage, englishFallback: true, seoLocale: "en" as Locale };
  }
  return { page: null, englishFallback: false, seoLocale: locale };
}

export async function generateMetadata(
  props: PageProps<"/[locale]/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const { page, seoLocale } = await resolveLegalPage(locale as Locale, slug);
  if (!page) return {};
  const seo = await getSeo("PAGE", page.id, seoLocale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: page.title,
    locale: locale as Locale,
    path: `/${slug}`,
  });
}

export default async function CmsPage(props: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();

  // Redirect English legal slugs on /hr to the Croatian localized slug.
  if (locale === "hr" && isEnglishLegalSlug(slug)) {
    const key = LEGAL_PAGES.find((l) => l.en === slug)!.key;
    redirect(`/hr/${legalSlug(key, "hr")}`);
  }

  const { page, englishFallback } = await resolveLegalPage(locale as Locale, slug);
  if (!page) notFound();

  return (
    <div className="py-6">
      {englishFallback && (
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="rounded-card border border-border bg-background-secondary px-4 py-2.5 text-sm text-muted">
            This legal document is currently available in English.
          </p>
        </div>
      )}
      <BlockRenderer
        blocks={page.blocks as unknown as BlockData[]}
        locale={locale as Locale}
      />
    </div>
  );
}
