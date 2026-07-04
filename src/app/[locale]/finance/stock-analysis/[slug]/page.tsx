import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getSeo } from "@/lib/content";
import {
  getStockAnalysisBySlug,
  getStockAnalyses,
  RISK_LABELS,
  IDEA_TYPE_LABELS,
  HORIZON_LABELS,
  strList,
} from "@/lib/finance-data";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { buildSeoMetadata, JsonLd, articleJsonLd, faqJsonLd } from "@/lib/seo";

export async function generateMetadata(
  props: PageProps<"/[locale]/finance/stock-analysis/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const analysis = await getStockAnalysisBySlug(slug);
  if (!analysis) return {};
  const seo = await getSeo("STOCK_ANALYSIS", analysis.id, locale as Locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: `${analysis.companyName} (${analysis.ticker}) Stock Analysis`,
    fallbackDescription: analysis.thesisSummary ?? undefined,
    locale: locale as Locale,
    path: `/finance/stock-analysis/${analysis.slug}`,
  });
}

function TextSection({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted">{text}</p>
    </section>
  );
}

export default async function StockAnalysisPage(
  props: PageProps<"/[locale]/finance/stock-analysis/[slug]">
) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const analysis = await getStockAnalysisBySlug(slug);
  if (!analysis) notFound();

  const bull = strList(analysis.bullCaseJson);
  const bear = strList(analysis.bearCaseJson);
  const risks = strList(analysis.keyRisksJson);
  const sources = strList(analysis.sourcesJson);
  const metrics = Array.isArray(analysis.keyMetricsJson)
    ? (analysis.keyMetricsJson as { label: string; value: string }[])
    : [];
  const faq = Array.isArray(analysis.faqJson)
    ? (analysis.faqJson as { question: string; answer: string }[])
    : [];
  const risk = RISK_LABELS[analysis.riskLevel];
  const related = (await getStockAnalyses(4)).filter((a) => a.id !== analysis.id).slice(0, 3);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: `${analysis.companyName} (${analysis.ticker}) Stock Analysis`,
          description: analysis.thesisSummary,
          authorName: analysis.author?.name,
          datePublished: analysis.publishedAt,
          dateModified: analysis.updatedAt,
          url: `${site}/${locale}/finance/stock-analysis/${analysis.slug}`,
        })}
      />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      {/* Hero */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-soft px-2 py-0.5 font-mono text-sm font-bold text-primary">
          {analysis.ticker}
        </span>
        {analysis.exchange && <span className="text-muted">{analysis.exchange}</span>}
        {analysis.sector && <span className="text-muted">· {analysis.sector}</span>}
        <span className={`rounded-full px-2 py-0.5 font-semibold ${risk.tone}`}>{risk.label}</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-muted">
          {IDEA_TYPE_LABELS[analysis.investmentIdeaType]}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-muted">
          {HORIZON_LABELS[analysis.timeHorizon]}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {analysis.companyName}
      </h1>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        {analysis.author && <span>By {analysis.author.name}</span>}
        {analysis.publishedAt && <span>· Published {analysis.publishedAt.toLocaleDateString(locale)}</span>}
        <span>· Updated {analysis.updatedAt.toLocaleDateString(locale)}</span>
        {analysis.lastReviewedAt && (
          <span>· Last reviewed {analysis.lastReviewedAt.toLocaleDateString(locale)}</span>
        )}
      </div>

      {/* Important disclaimer right below hero */}
      <FinanceDisclaimer variant="stock" locale={locale} className="mt-5" />

      {/* Thesis */}
      {analysis.thesisSummary && (
        <p className="mt-6 text-lg leading-relaxed">{analysis.thesisSummary}</p>
      )}

      {/* Key metrics box */}
      {metrics.length > 0 && (
        <div className="mt-6 grid gap-3 rounded-card border border-border bg-background-secondary p-5 sm:grid-cols-3">
          {metrics.map((m, i) => (
            <div key={i}>
              <div className="text-xs text-muted">{m.label}</div>
              <div className="mt-0.5 font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bull & bear cases */}
      {(bull.length > 0 || bear.length > 0) && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
              <TrendingUp size={16} /> Bull case
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {bull.map((b) => <li key={b} className="flex gap-2"><span className="text-green-600 dark:text-green-400">+</span>{b}</li>)}
            </ul>
          </div>
          <div className="rounded-card border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-semibold text-red-500">
              <TrendingDown size={16} /> Bear case
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {bear.map((b) => <li key={b} className="flex gap-2"><span className="text-red-500">−</span>{b}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Key risks */}
      {risks.length > 0 && (
        <section className="mt-6 rounded-card border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" /> Key risks
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {risks.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        </section>
      )}

      <TextSection title="Valuation overview" text={analysis.valuationOverview} />
      <TextSection title="Growth overview" text={analysis.growthOverview} />
      <TextSection title="Profitability" text={analysis.profitabilityOverview} />
      <TextSection title="Balance sheet & debt" text={analysis.debtOverview} />
      <TextSection title="Dividends" text={analysis.dividendOverview} />

      {/* Final editorial view */}
      {analysis.conclusion && (
        <section className="mt-8 rounded-card border border-primary/30 bg-soft p-6">
          <h2 className="text-lg font-bold">Final editorial view</h2>
          <p className="mt-2 leading-relaxed">{analysis.conclusion}</p>
        </section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sources</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {sources.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Frequently asked questions</h2>
          <div className="mt-3"><FaqAccordion items={faq} /></div>
        </section>
      )}

      {/* Soft CTAs only — no buy buttons on stock pages */}
      <div className="mt-10 flex flex-wrap gap-2">
        <Link
          href={`/${locale}/finance/stock-analysis`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Compare with similar stocks
        </Link>
        <Link
          href={`/${locale}/finance/guides`}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Learn how to analyze this sector
        </Link>
      </div>

      {/* Related analyses */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Related analyses</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {related.map((a) => (
              <Link
                key={a.id}
                href={`/${locale}/finance/stock-analysis/${a.slug}`}
                className="group rounded-card border border-border bg-card p-4 transition-all hover:border-primary/40"
              >
                <span className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs font-bold text-primary">{a.ticker}</span>
                <div className="mt-1.5 text-sm font-medium group-hover:text-primary">{a.companyName}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 space-y-3">
        <FinanceDisclaimer variant="general" locale={locale} />
        <p className="text-xs text-muted">
          How we work:{" "}
          <Link href={`/${locale}/editorial-policy`} className="text-primary hover:underline">
            Editorial Policy
          </Link>
        </p>
      </div>
    </article>
  );
}
