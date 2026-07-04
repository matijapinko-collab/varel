import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getStockAnalyses, RISK_LABELS, IDEA_TYPE_LABELS, HORIZON_LABELS } from "@/lib/finance-data";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";

export const metadata: Metadata = {
  title: "Stock Analysis — Editorial Investment Ideas & Watchlists",
  description:
    "Editorial stock analysis and long-term investment ideas: bull and bear cases, key risks and valuation context. Educational content, not financial advice.",
};

export default async function StockAnalysisListPage(
  props: PageProps<"/[locale]/finance/stock-analysis">
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const analyses = await getStockAnalyses(50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Stock Analysis</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Editorial analysis and educational investment ideas — bull cases, bear cases, key
        risks and valuation context. Never personalized advice.
      </p>
      <FinanceDisclaimer variant="stock" locale={locale} className="mt-4 max-w-3xl" />

      {analyses.length === 0 ? (
        <p className="mt-10 text-muted">No analyses published yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {analyses.map((a) => {
            const risk = RISK_LABELS[a.riskLevel];
            return (
              <Link
                key={a.id}
                href={`/${locale}/finance/stock-analysis/${a.slug}`}
                className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-soft px-1.5 py-0.5 font-mono font-bold text-primary">{a.ticker}</span>
                  {a.exchange && <span className="text-muted">{a.exchange}</span>}
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${risk.tone}`}>{risk.label}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold group-hover:text-primary">{a.companyName}</h2>
                {a.thesisSummary && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{a.thesisSummary}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{IDEA_TYPE_LABELS[a.investmentIdeaType]}</span>
                  <span>· {HORIZON_LABELS[a.timeHorizon]}</span>
                  {a.lastReviewedAt && (
                    <span>· Last reviewed {a.lastReviewedAt.toLocaleDateString(locale)}</span>
                  )}
                </div>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  Read full analysis →
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <FinanceDisclaimer variant="general" locale={locale} className="mt-8 max-w-3xl" />
    </div>
  );
}
