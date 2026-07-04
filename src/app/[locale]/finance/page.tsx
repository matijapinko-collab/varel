import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLanguage } from "@/lib/content";
import {
  getFinancePlatforms,
  getStockAnalyses,
  getFinanceGuides,
  RISK_LABELS,
  IDEA_TYPE_LABELS,
} from "@/lib/finance-data";
import { PlatformCard, type PlatformCardData } from "@/components/finance/platform-card";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Finance — Investing Apps, Trading Platforms & Stock Analysis",
    description:
      "Compare investing apps, trading platforms, brokers, and financial tools. Read practical guides, stock analysis, and educational content for smarter investing decisions.",
  };
}

export default async function FinanceHubPage(props: PageProps<"/[locale]/finance">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const language = await getLanguage(locale as Locale);

  const [apps, tradingPlatforms, brokers, analyses, guides] = await Promise.all([
    getFinancePlatforms({ type: "INVESTING_APP", take: 4 }),
    getFinancePlatforms({ type: "TRADING_PLATFORM", take: 4 }),
    getFinancePlatforms({ type: "BROKER", take: 4 }),
    getStockAnalyses(4),
    language ? getFinanceGuides(language.id, 4) : Promise.resolve([]),
  ]);

  const sections: { title: string; href: string; items: typeof apps }[] = [
    { title: "Best investing apps", href: `/${locale}/finance/investing-apps`, items: apps },
    { title: "Best trading platforms", href: `/${locale}/finance/trading-platforms`, items: tradingPlatforms },
    { title: "Latest broker reviews", href: `/${locale}/finance/brokers`, items: brokers },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="rounded-card border border-border bg-gradient-to-r from-soft to-background-secondary p-8 sm:p-12">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Finance</div>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Understand investing tools before you use them.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Compare investing apps, trading platforms, brokers, and financial tools. Read
          practical guides, stock analysis, and educational content for smarter investing
          decisions.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["Investing Apps", "investing-apps"],
            ["Trading Platforms", "trading-platforms"],
            ["Broker Reviews", "brokers"],
            ["Stock Analysis", "stock-analysis"],
            ["Guides", "guides"],
          ].map(([label, path]) => (
            <Link
              key={path}
              href={`/${locale}/finance/${path}`}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <FinanceDisclaimer variant="general" locale={locale} className="mt-4" />

      {/* Platform sections */}
      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.title} className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                <Link href={section.href} className="text-sm font-medium text-primary hover:underline">
                  View all →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {section.items.map((p) => (
                  <PlatformCard key={p.id} platform={p as unknown as PlatformCardData} locale={locale} />
                ))}
              </div>
            </section>
          )
      )}

      {/* Stock analysis */}
      {analyses.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Latest stock analysis</h2>
            <Link href={`/${locale}/finance/stock-analysis`} className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {analyses.map((a) => {
              const risk = RISK_LABELS[a.riskLevel];
              return (
                <Link
                  key={a.id}
                  href={`/${locale}/finance/stock-analysis/${a.slug}`}
                  className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-soft px-1.5 py-0.5 font-mono font-bold text-primary">
                      {a.ticker}
                    </span>
                    <span className="text-muted">{a.sector ?? a.exchange}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${risk.tone}`}>{risk.label}</span>
                  </div>
                  <h3 className="mt-2 font-semibold group-hover:text-primary">{a.companyName}</h3>
                  {a.thesisSummary && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted">{a.thesisSummary}</p>
                  )}
                  <div className="mt-2 text-xs text-muted">
                    {IDEA_TYPE_LABELS[a.investmentIdeaType]} ·{" "}
                    {a.lastReviewedAt && `Last reviewed ${a.lastReviewedAt.toLocaleDateString(locale)}`}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Finance guides */}
      {guides.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Investing guides</h2>
            <Link href={`/${locale}/finance/guides`} className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <Link
                key={g.id}
                href={`/${locale}/guides/${g.slug}`}
                className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Educational guide
                </div>
                <h3 className="mt-1.5 font-semibold group-hover:text-primary">{g.title}</h3>
                {g.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{g.excerpt}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 space-y-3">
        <FinanceDisclaimer variant="trading" locale={locale} />
        <FinanceDisclaimer variant="affiliate" locale={locale} />
        <p className="text-xs text-muted">
          Read our{" "}
          <Link href={`/${locale}/editorial-policy`} className="text-primary hover:underline">
            Editorial Policy
          </Link>{" "}
          to learn how reviews and ratings are produced.
        </p>
      </div>
    </div>
  );
}
