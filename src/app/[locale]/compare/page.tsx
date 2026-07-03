import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";

export async function generateMetadata(
  props: PageProps<"/[locale]/compare">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_compare };
}

export default async function ComparePage(props: PageProps<"/[locale]/compare">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const language = await getLanguage(locale);
  const comparisons = language
    ? await db.comparisonTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          comparison: { status: "PUBLISHED", deletedAt: null },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.nav_compare}</h1>
      <p className="mt-2 text-muted">{t.latest_comparisons}</p>
      {comparisons.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {comparisons.map((cmp) => (
            <Link
              key={cmp.id}
              href={`/${locale}/compare/${cmp.slug}`}
              className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <h2 className="font-semibold group-hover:text-primary">{cmp.title}</h2>
              {cmp.summary && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{cmp.summary}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
