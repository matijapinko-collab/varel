import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";

export async function generateMetadata(
  props: PageProps<"/[locale]/deals">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_deals };
}

export default async function DealsPage(props: PageProps<"/[locale]/deals">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const language = await getLanguage(locale);
  const deals = language
    ? await db.dealTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          deal: { status: "PUBLISHED", deletedAt: null },
        },
        include: { deal: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.deals_title}</h1>
      <p className="mt-2 text-xs text-muted">{t.affiliate_disclosure_short}</p>
      {deals.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d) => (
            <Link
              key={d.id}
              href={`/${locale}/deals/${d.slug}`}
              className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {d.deal.brandName}
                </span>
                {d.deal.discountPercent != null && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    -{d.deal.discountPercent}%
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-semibold group-hover:text-primary">{d.title}</h2>
              {d.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{d.description}</p>
              )}
              <div className="mt-3 flex items-baseline gap-2">
                {d.deal.newPrice != null && (
                  <span className="text-lg font-bold">
                    {d.deal.currency === "USD" ? "$" : d.deal.currency + " "}
                    {String(d.deal.newPrice)}
                  </span>
                )}
                {d.deal.oldPrice != null && (
                  <span className="text-sm text-muted line-through">
                    {d.deal.currency === "USD" ? "$" : d.deal.currency + " "}
                    {String(d.deal.oldPrice)}
                  </span>
                )}
              </div>
              {d.deal.validUntil && (
                <div className="mt-2 text-xs text-muted">
                  {t.valid_until}: {d.deal.validUntil.toLocaleDateString(locale)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
