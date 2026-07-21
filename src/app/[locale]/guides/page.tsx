import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";
import { postCategorySelect, postPathFor } from "@/lib/post-url";

export async function generateMetadata(
  props: PageProps<"/[locale]/guides">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_guides };
}

export default async function GuidesPage(props: PageProps<"/[locale]/guides">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const language = await getLanguage(locale);
  const guides = language
    ? await db.articleTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          article: { status: "PUBLISHED", deletedAt: null },
        },
        include: { article: { include: { author: true, ...postCategorySelect } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.nav_guides}</h1>
      {guides.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.id}
              href={postPathFor(locale, g.slug, g.article, g.languageId)}
              className="group rounded-card border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                {g.article.type === "CORNERSTONE" ? "Cornerstone" : "Guide"}
              </div>
              <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary">
                {g.title}
              </h2>
              {g.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-muted">{g.excerpt}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
