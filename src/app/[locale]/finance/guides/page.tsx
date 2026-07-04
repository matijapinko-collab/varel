import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLanguage } from "@/lib/content";
import { getFinanceGuides } from "@/lib/finance-data";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";

export const metadata: Metadata = {
  title: "Investment Guides — Investing for Beginners & Education",
  description:
    "Educational investing guides: how to start investing, choose a broker, compare platforms, understand risk and build long-term habits. Not financial advice.",
};

export default async function FinanceGuidesPage(
  props: PageProps<"/[locale]/finance/guides">
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const language = await getLanguage(locale as Locale);
  const guides = language ? await getFinanceGuides(language.id, 50) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Investment Guides</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Educational guides on how to invest: choosing a broker, comparing platforms,
        understanding risk and building a long-term approach.
      </p>
      <FinanceDisclaimer variant="general" locale={locale} className="mt-4 max-w-3xl" />

      {guides.length === 0 ? (
        <p className="mt-10 text-muted">
          No finance guides published yet — create one in Admin → Guides and set its
          vertical to Finance.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.id}
              href={`/${locale}/guides/${g.slug}`}
              className="group rounded-card border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                {g.article.type === "CORNERSTONE" ? "Cornerstone guide" : "Educational guide"}
              </div>
              <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary">
                {g.title}
              </h2>
              {g.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{g.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
