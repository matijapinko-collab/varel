import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";

export async function generateMetadata(
  props: PageProps<"/[locale]/news">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_news };
}

export default async function NewsPage(props: PageProps<"/[locale]/news">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const language = await getLanguage(locale);
  const news = language
    ? await db.newsTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          newsItem: { status: "PUBLISHED", deletedAt: null },
        },
        include: { newsItem: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.nav_news}</h1>
      {news.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 divide-y divide-border rounded-card border border-border bg-card">
          {news.map((n) => (
            <Link
              key={n.id}
              href={`/${locale}/news/${n.slug}`}
              className="group block px-6 py-5 transition-colors hover:bg-soft"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold group-hover:text-primary">{n.title}</h2>
                <span className="shrink-0 text-xs text-muted">
                  {(n.newsItem.publishedAt ?? n.newsItem.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
              {n.summary && (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{n.summary}</p>
              )}
              {n.newsItem.sourceName && (
                <div className="mt-1.5 text-xs text-muted">
                  {t.source}: {n.newsItem.sourceName}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
