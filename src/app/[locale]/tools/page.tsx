import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPublishedTools, getCategories } from "@/lib/content";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { SearchBar } from "@/components/blocks/search-bar";

export async function generateMetadata(
  props: PageProps<"/[locale]/tools">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_discover, description: t.hero_subtitle };
}

export default async function ToolsPage(props: PageProps<"/[locale]/tools">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;
  const categorySlug =
    typeof searchParams.category === "string" ? searchParams.category : undefined;

  const t = getDictionary(locale);
  const [tools, categories] = await Promise.all([
    getPublishedTools(locale, { take: 60, categorySlug }),
    getCategories(locale, {}),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.nav_discover}</h1>
      <p className="mt-2 text-muted">{t.hero_subtitle}</p>
      <div className="mt-6 max-w-xl">
        <SearchBar locale={locale} placeholder={t.search_placeholder} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/${locale}/tools`}
          className={`rounded-full border px-3 py-1 text-sm ${!categorySlug ? "border-primary bg-soft font-medium text-primary" : "border-border text-muted hover:text-foreground"}`}
        >
          {t.all_tools}
        </Link>
        {categories
          .filter((c) => c._count.tools > 0)
          .map((cat) => {
            const tr = cat.translations[0];
            return (
              <Link
                key={cat.id}
                href={`/${locale}/tools?category=${cat.slug}`}
                className={`rounded-full border px-3 py-1 text-sm ${categorySlug === cat.slug ? "border-primary bg-soft font-medium text-primary" : "border-border text-muted hover:text-foreground"}`}
              >
                {tr?.name ?? cat.slug}
              </Link>
            );
          })}
      </div>

      {tools.length === 0 ? (
        // Distinguish "your filter matched nothing" from "there is no content yet",
        // so an empty directory doesn't read like a broken search.
        categorySlug ? (
          <div className="mt-10 rounded-card border border-border bg-card p-8 text-center">
            <p className="font-medium">{t.no_results}</p>
            <p className="mt-1 text-sm text-muted">{t.no_results_hint}</p>
            <Link
              href={`/${locale}/tools`}
              className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t.clear_filters}
            </Link>
          </div>
        ) : (
          <div className="mt-10 rounded-card border border-dashed border-border bg-card p-10 text-center">
            <h2 className="text-lg font-semibold">{t.directory_empty_title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t.directory_empty_body}</p>
          </div>
        )
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
