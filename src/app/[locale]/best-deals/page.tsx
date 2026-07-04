import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getBestDeals, getDealFacets, type DealSort } from "@/lib/deals-data";
import { DealCard, type DealCardData } from "@/components/cards/deal-card";
import { DealsFilters } from "@/components/blocks/deals-filters";
import { AffiliateDisclosure } from "@/components/blocks/affiliate-disclosure";
import { TrackView } from "@/components/analytics/track-view";

export async function generateMetadata(
  props: PageProps<"/[locale]/best-deals">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return {
    title: t.best_deals_title,
    description: t.best_deals_subtitle,
  };
}

export default async function BestDealsPage(props: PageProps<"/[locale]/best-deals">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const sp = await props.searchParams;
  const t = getDictionary(locale);

  const category = typeof sp.category === "string" ? sp.category : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : undefined;
  const sort = (typeof sp.sort === "string" ? sp.sort : "newest") as DealSort;
  const discount = typeof sp.discount === "string" ? sp.discount : "0";
  const isFiltered = Boolean(category || brand || (discount && discount !== "0") || sort !== "newest");

  const [facets, featured, deals] = await Promise.all([
    getDealFacets(),
    isFiltered ? Promise.resolve([]) : getBestDeals(locale, { featured: true, take: 6 }),
    getBestDeals(locale, {
      categorySlug: category,
      brand,
      minDiscount: Number(discount) || 0,
      sort,
      take: 60,
    }),
  ]);

  const featuredIds = new Set(featured.map((d) => d.id));
  const rest = deals.filter((d) => !featuredIds.has(d.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <TrackView type="PAGE_VIEW" locale={locale} />
      <h1 className="text-3xl font-bold tracking-tight">{t.best_deals_title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.best_deals_subtitle}</p>
      <AffiliateDisclosure locale={locale} className="mt-4 max-w-3xl" />

      <div className="mt-6">
        <DealsFilters
          locale={locale}
          facets={facets}
          current={{ category, brand, sort, discount }}
        />
      </div>

      {featured.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">{t.featured_deals}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((deal) => (
              <DealCard key={deal.id} deal={deal as unknown as DealCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        {!isFiltered && featured.length > 0 && (
          <h2 className="mb-4 text-xl font-bold">{t.latest_deals}</h2>
        )}
        {rest.length === 0 ? (
          <p className="text-muted">{t.no_results}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((deal) => (
              <DealCard key={deal.id} deal={deal as unknown as DealCardData} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
