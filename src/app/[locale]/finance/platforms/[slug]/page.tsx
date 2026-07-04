/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Check, X, ExternalLink } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getSeo } from "@/lib/content";
import {
  getFinancePlatformBySlug,
  FINANCE_TYPE_LABELS,
  strList,
} from "@/lib/finance-data";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { buildSeoMetadata, JsonLd, faqJsonLd } from "@/lib/seo";

export async function generateMetadata(
  props: PageProps<"/[locale]/finance/platforms/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const platform = await getFinancePlatformBySlug(slug);
  if (!platform) return {};
  const seo = await getSeo("FINANCE_PLATFORM", platform.id, locale as Locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: `${platform.name} Review — Fees, Features & Verdict`,
    fallbackDescription: platform.description ?? undefined,
    locale: locale as Locale,
    path: `/finance/platforms/${platform.slug}`,
  });
}

const RATING_ROWS: [label: string, key: string][] = [
  ["Fees", "ratingFees"],
  ["Ease of use", "ratingEaseOfUse"],
  ["Features", "ratingFeatures"],
  ["Research tools", "ratingResearchTools"],
  ["Support", "ratingSupport"],
];

export default async function FinancePlatformPage(
  props: PageProps<"/[locale]/finance/platforms/[slug]">
) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const platform = await getFinancePlatformBySlug(slug);
  if (!platform) notFound();

  const pros = strList(platform.prosJson);
  const cons = strList(platform.consJson);
  const assets = strList(platform.supportedAssetsJson);
  const countries = strList(platform.supportedCountriesJson);
  const faq = Array.isArray(platform.faqJson)
    ? (platform.faqJson as { question: string; answer: string }[])
    : [];
  const visitHref = platform.affiliateUrl ?? platform.websiteUrl;
  const isTradingType = platform.type === "BROKER" || platform.type === "TRADING_PLATFORM";

  const reviewLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: platform.name,
      applicationCategory: "FinanceApplication",
      operatingSystem: platform.mobileApp ? "iOS, Android, Web" : "Web",
    },
    reviewRating:
      platform.ratingOverall != null
        ? { "@type": "Rating", ratingValue: platform.ratingOverall, bestRating: 5 }
        : undefined,
    author: { "@type": "Organization", name: "Varel" },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <JsonLd data={reviewLd} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      {/* Hero */}
      <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        {platform.logo ? (
          <img
            src={platform.logo.url}
            alt={platform.logo.altText ?? platform.name}
            className="h-16 w-16 rounded-xl border border-border object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-soft text-2xl font-bold text-primary">
            {platform.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            {FINANCE_TYPE_LABELS[platform.type]} review
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{platform.name}</h1>
            {platform.ratingOverall != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-sm font-semibold text-primary">
                <Star size={13} fill="currentColor" /> {platform.ratingOverall.toFixed(1)}/5
              </span>
            )}
          </div>
          {platform.description && (
            <p className="mt-1.5 max-w-xl text-muted">{platform.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {platform.companyName && <span>By {platform.companyName}</span>}
            {platform.lastReviewedAt && (
              <span>· Last reviewed {platform.lastReviewedAt.toLocaleDateString(locale)}</span>
            )}
            <span>· Updated {platform.updatedAt.toLocaleDateString(locale)}</span>
          </div>
        </div>
        {visitHref && (
          <a
            href={visitHref}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Visit platform <ExternalLink size={15} />
          </a>
        )}
      </div>

      <FinanceDisclaimer
        variant={isTradingType ? "trading" : "general"}
        locale={locale}
        className="mt-4"
      />

      {/* Quick summary box */}
      <div className="mt-6 grid gap-3 rounded-card border border-border bg-background-secondary p-5 sm:grid-cols-2">
        {platform.bestFor && (
          <div><span className="text-xs font-semibold uppercase text-muted">Best for</span><p className="mt-0.5 text-sm">{platform.bestFor}</p></div>
        )}
        {platform.feeSummary && (
          <div><span className="text-xs font-semibold uppercase text-muted">Fees</span><p className="mt-0.5 text-sm">{platform.feeSummary}</p></div>
        )}
        {platform.minimumDeposit && (
          <div><span className="text-xs font-semibold uppercase text-muted">Minimum deposit</span><p className="mt-0.5 text-sm">{platform.minimumDeposit}</p></div>
        )}
        {countries.length > 0 && (
          <div><span className="text-xs font-semibold uppercase text-muted">Availability</span><p className="mt-0.5 text-sm">{countries.join(", ")}</p></div>
        )}
        {assets.length > 0 && (
          <div><span className="text-xs font-semibold uppercase text-muted">Supported assets</span><p className="mt-0.5 text-sm">{assets.join(", ")}</p></div>
        )}
        <div>
          <span className="text-xs font-semibold uppercase text-muted">Access</span>
          <p className="mt-0.5 text-sm">
            {[
              platform.mobileApp && "Mobile app",
              platform.webPlatform && "Web",
              platform.desktopPlatform && "Desktop",
              platform.demoAccount && "Demo account",
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      </div>

      {/* Ratings breakdown */}
      {RATING_ROWS.some(([, key]) => (platform as Record<string, unknown>)[key] != null) && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Our ratings</h2>
          <div className="mt-3 space-y-2 rounded-card border border-border bg-card p-5">
            {RATING_ROWS.map(([label, key]) => {
              const value = (platform as Record<string, unknown>)[key] as number | null;
              if (value == null) return null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-muted">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold">{value.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pros & cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Pros & cons</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-card p-5">
              <div className="font-semibold text-green-600 dark:text-green-400">Pros</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {pros.map((p) => (
                  <li key={p} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-card border border-border bg-card p-5">
              <div className="font-semibold text-red-500">Cons</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {cons.map((c) => (
                  <li key={c} className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-red-500" />{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Full review */}
      {platform.reviewContent && (
        <section className="mt-8">
          <div className="prose-varel" dangerouslySetInnerHTML={{ __html: platform.reviewContent }} />
        </section>
      )}

      {/* Who should avoid it */}
      {platform.whoShouldAvoid && (
        <section className="mt-8 rounded-card border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Who should avoid it</h2>
          <p className="mt-2 text-sm text-muted">{platform.whoShouldAvoid}</p>
        </section>
      )}

      {/* Custom risk section */}
      {platform.riskDisclaimer && (
        <section className="mt-4 rounded-card border border-orange-500/30 bg-orange-500/5 p-5">
          <h2 className="text-lg font-bold">Risk overview</h2>
          <p className="mt-2 text-sm text-muted">{platform.riskDisclaimer}</p>
        </section>
      )}

      {/* Alternatives */}
      {platform.alternatives.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Best alternatives</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {platform.alternatives.map((alt) => (
              <Link
                key={alt.id}
                href={`/${locale}/finance/platforms/${alt.alternativePlatform.slug}`}
                className="group flex items-center justify-between rounded-card border border-border bg-card px-5 py-4 transition-all hover:border-primary/40"
              >
                <span className="font-medium group-hover:text-primary">
                  {alt.alternativePlatform.name}
                </span>
                {alt.reason && <span className="text-xs text-muted">{alt.reason}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Frequently asked questions</h2>
          <div className="mt-3"><FaqAccordion items={faq} /></div>
        </section>
      )}

      <div className="mt-8 space-y-3">
        <FinanceDisclaimer variant="affiliate" locale={locale} />
        <p className="text-xs text-muted">
          How we review:{" "}
          <Link href={`/${locale}/editorial-policy`} className="text-primary hover:underline">
            Editorial Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
