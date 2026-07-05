import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getBestDeals } from "@/lib/deals-data";
import { DealCard, type DealCardData } from "@/components/cards/deal-card";
import { AffiliateDisclosure } from "@/components/blocks/affiliate-disclosure";
import { TrackView } from "@/components/analytics/track-view";
import { PriceChecker } from "@/components/price-checker/price-checker";
import { getPriceCheckerSettings, isAmazonConfigured } from "@/lib/price-checker/config";

const SEO = {
  title: "Varel Price Checker | Find Better Prices on Amazon.de",
  description:
    "Search Amazon.de products with Varel Price Checker and find current prices, product details and affiliate offers in one clean tool.",
  intro:
    "Find better prices on Amazon.de with a clean, fast product search built for smarter buying decisions.",
};

export async function generateMetadata(
  props: PageProps<"/[locale]/best-deals">
): Promise<Metadata> {
  const { locale } = await props.params;
  const base = `/${locale}/best-deals`;
  return {
    title: SEO.title,
    description: SEO.description,
    alternates: { canonical: base },
    openGraph: { title: SEO.title, description: SEO.description, url: base },
  };
}

export default async function BestDealsPage(props: PageProps<"/[locale]/best-deals">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [settings, curated] = await Promise.all([
    getPriceCheckerSettings(),
    getBestDeals(locale, { take: 12 }).catch(() => []),
  ]);
  const available = settings.enabled && isAmazonConfigured();

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: settings.pageTitle,
    applicationCategory: "ShoppingApplication",
    operatingSystem: "Web",
    description: SEO.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <TrackView type="PAGE_VIEW" entityType="PRICE_CHECKER" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />

      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{settings.pageTitle}</h1>
        <p className="mt-3 text-lg text-muted">{settings.pageSubtitle}</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">{SEO.intro}</p>
      </div>

      {/* Search tool */}
      <div className="mt-8">
        <PriceChecker
          available={available}
          copy={{
            searchPlaceholder: settings.searchPlaceholder,
            noResultsMessage: settings.noResultsMessage,
            errorMessage: settings.errorMessage,
            unavailableMessage: settings.unavailableMessage,
          }}
        />
      </div>

      {/* Affiliate disclosure */}
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted">
        {settings.affiliateDisclosure}
      </p>

      {/* Curated Best Deals (kept below the tool) */}
      {curated.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold tracking-tight">{t.best_deals_title}</h2>
          <p className="mt-2 max-w-2xl text-muted">{t.best_deals_subtitle}</p>
          <AffiliateDisclosure locale={locale} className="mt-4 max-w-3xl" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {curated.map((deal) => (
              <DealCard key={deal.id} deal={deal as unknown as DealCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
