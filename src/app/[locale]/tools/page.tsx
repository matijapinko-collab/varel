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
        <p className="mt-10 text-muted">{t.no_results}</p>
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
