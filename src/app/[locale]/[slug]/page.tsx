import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPageBySlug, getSeo } from "@/lib/content";
import {
  BlockRenderer,
  type BlockData,
} from "@/components/blocks/block-renderer";
import { buildSeoMetadata } from "@/lib/seo";

/**
 * Catch-all CMS page route: any page created in the page builder
 * (about, contact, legal pages, landing pages…) renders here.
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const page = await getPageBySlug(locale, slug);
  if (!page) return {};
  const seo = await getSeo("PAGE", page.id, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: page.title,
    locale,
    path: `/${page.slug}`,
  });
}

export default async function CmsPage(props: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const page = await getPageBySlug(locale as Locale, slug);
  if (!page) notFound();

  return (
    <div className="py-6">
      <BlockRenderer
        blocks={page.blocks as unknown as BlockData[]}
        locale={locale as Locale}
      />
    </div>
  );
}
