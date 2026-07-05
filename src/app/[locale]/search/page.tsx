import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPublishedTools, getLanguage } from "@/lib/content";
import { db } from "@/lib/db";
import Link from "next/link";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { SearchBar } from "@/components/blocks/search-bar";
import { TrackSearch } from "@/components/analytics/track-search";

export async function generateMetadata(
  props: PageProps<"/[locale]/search">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.search_button, robots: { index: false } };
}

export default async function SearchPage(props: PageProps<"/[locale]/search">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 100) : "";
  const t = getDictionary(locale);
  const language = await getLanguage(locale);

  const [tools, articles, comparisons, prompts] =
    q && language
      ? await Promise.all([
          getPublishedTools(locale, { query: q, take: 12 }),
          db.articleTranslation.findMany({
            where: {
              languageId: language.id,
              status: "PUBLISHED",
              article: { status: "PUBLISHED", deletedAt: null },
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { excerpt: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 6,
          }),
          db.comparisonTranslation.findMany({
            where: {
              languageId: language.id,
              status: "PUBLISHED",
              comparison: { status: "PUBLISHED", deletedAt: null },
              title: { contains: q, mode: "insensitive" },
            },
            take: 6,
          }),
          db.promptTranslation.findMany({
            where: {
              languageId: language.id,
              status: "PUBLISHED",
              prompt: { status: "PUBLISHED", deletedAt: null },
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 6,
          }),
        ])
      : [[], [], [], []];

  const total =
    tools.length + articles.length + comparisons.length + prompts.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {q && <TrackSearch query={q} resultCount={total} locale={locale} />}
      <h1 className="text-2xl font-bold tracking-tight">
        {q ? `${t.search_results_for} “${q}”` : t.search_button}
      </h1>
      <div className="mt-4 max-w-xl">
        <SearchBar locale={locale} placeholder={t.search_placeholder} />
      </div>

      {q && total === 0 && <p className="mt-10 text-muted">{t.no_results}</p>}

      {tools.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">{t.all_tools}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {comparisons.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">{t.latest_comparisons}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {comparisons.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/compare/${c.slug}`}
                className="rounded-card border border-border bg-card px-5 py-4 font-medium hover:border-primary/40 hover:text-primary"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">{t.latest_guides}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/${locale}/guides/${a.slug}`}
                className="rounded-card border border-border bg-card px-5 py-4 font-medium hover:border-primary/40 hover:text-primary"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {prompts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">{t.nav_prompts}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {prompts.map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/prompts/${p.slug}`}
                className="rounded-card border border-border bg-card px-5 py-4 font-medium hover:border-primary/40 hover:text-primary"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
