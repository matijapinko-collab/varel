import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { buildSeoMetadata } from "@/lib/seo";

async function getNews(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.newsTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      newsItem: { status: "PUBLISHED", deletedAt: null },
    },
    include: {
      newsItem: {
        include: {
          relatedTools: {
            include: {
              tool: {
                include: {
                  logo: true,
                  translations: { where: { languageId: language.id } },
                  categories: {
                    include: {
                      category: {
                        include: {
                          translations: { where: { languageId: language.id } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata(
  props: PageProps<"/[locale]/news/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const news = await getNews(locale, slug);
  if (!news) return {};
  const seo = await getSeo("NEWS", news.newsItemId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: news.title,
    fallbackDescription: news.summary ?? undefined,
    locale,
    path: `/news/${news.slug}`,
  });
}

export default async function NewsItemPage(props: PageProps<"/[locale]/news/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const news = await getNews(locale, slug);
  if (!news) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">
        {t.nav_news}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{news.title}</h1>
      <div className="mt-3 flex flex-wrap gap-x-3 text-sm text-muted">
        <span>
          {(news.newsItem.publishedAt ?? news.newsItem.createdAt).toLocaleDateString(locale)}
        </span>
        {news.newsItem.sourceName && (
          <span>
            · {t.source}:{" "}
            {news.newsItem.sourceUrl ? (
              <a
                href={news.newsItem.sourceUrl}
                target="_blank"
                rel="noopener nofollow"
                className="text-primary hover:underline"
              >
                {news.newsItem.sourceName}
              </a>
            ) : (
              news.newsItem.sourceName
            )}
          </span>
        )}
      </div>

      {news.summary && <p className="mt-6 text-lg text-muted">{news.summary}</p>}
      {news.body && (
        <div className="prose-varel mt-6" dangerouslySetInnerHTML={{ __html: news.body }} />
      )}
      {news.whyItMatters && (
        <div className="mt-8 rounded-card border border-primary/30 bg-soft p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t.why_it_matters}
          </div>
          <p className="mt-2">{news.whyItMatters}</p>
        </div>
      )}

      {news.newsItem.relatedTools.length > 0 && (
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {news.newsItem.relatedTools.map(({ tool }) => (
              <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
