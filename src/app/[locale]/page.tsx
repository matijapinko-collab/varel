import { isLocale, type Locale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { getHomepage } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  BlockRenderer,
  type BlockData,
} from "@/components/blocks/block-renderer";
import { SearchBar } from "@/components/blocks/search-bar";

/**
 * Homepage — rendered entirely from page-builder blocks stored in the CMS.
 * If no homepage has been created yet (fresh install), a minimal default
 * hero is shown so the site is never blank.
 */
export default async function HomePage(props: PageProps<"/[locale]">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();

  const page = await getHomepage(locale as Locale).catch(() => null);
  const t = getDictionary(locale as Locale);

  if (!page || page.blocks.length === 0) {
    return (
      <section className="bg-gradient-to-b from-soft to-background px-4 pb-16 pt-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t.hero_title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            {t.hero_subtitle}
          </p>
          <div className="mt-8">
            <SearchBar locale={locale as Locale} large placeholder={t.search_placeholder} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <BlockRenderer
      blocks={page.blocks as unknown as BlockData[]}
      locale={locale as Locale}
    />
  );
}
