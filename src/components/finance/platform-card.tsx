/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { FINANCE_TYPE_LABELS, strList } from "@/lib/finance-data";
import type { FinancePlatformType } from "@/generated/prisma/client";

export type PlatformCardData = {
  id: string;
  name: string;
  slug: string;
  type: FinancePlatformType;
  description: string | null;
  bestFor: string | null;
  feeSummary: string | null;
  minimumDeposit: string | null;
  ratingOverall: number | null;
  beginnerFriendly: boolean;
  affiliateUrl: string | null;
  websiteUrl: string | null;
  supportedCountriesJson: unknown;
  logo: { url: string; altText: string | null } | null;
};

export function PlatformCard({ platform, locale }: { platform: PlatformCardData; locale: Locale }) {
  const countries = strList(platform.supportedCountriesJson);
  const visitHref = platform.affiliateUrl ?? platform.websiteUrl;

  return (
    <div className="group flex flex-col rounded-card border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {platform.logo ? (
            <img
              src={platform.logo.url}
              alt={platform.logo.altText ?? platform.name}
              className="h-10 w-10 rounded-lg border border-border object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-sm font-bold text-primary">
              {platform.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <Link
              href={`/${locale}/finance/platforms/${platform.slug}`}
              className="font-semibold leading-tight hover:text-primary"
            >
              {platform.name}
            </Link>
            <div className="text-xs text-muted">{FINANCE_TYPE_LABELS[platform.type]}</div>
          </div>
        </div>
        {platform.ratingOverall != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-primary">
            <Star size={11} fill="currentColor" /> {platform.ratingOverall.toFixed(1)}
          </span>
        )}
      </div>

      {platform.description && (
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">{platform.description}</p>
      )}

      <dl className="mt-3 space-y-1 text-xs text-muted">
        {platform.bestFor && (
          <div><dt className="inline font-medium text-foreground">Best for: </dt><dd className="inline">{platform.bestFor}</dd></div>
        )}
        {platform.feeSummary && (
          <div><dt className="inline font-medium text-foreground">Fees: </dt><dd className="inline line-clamp-1">{platform.feeSummary}</dd></div>
        )}
        {countries.length > 0 && (
          <div><dt className="inline font-medium text-foreground">Availability: </dt><dd className="inline">{countries.join(", ")}</dd></div>
        )}
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/${locale}/finance/platforms/${platform.slug}`}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          Read review
        </Link>
        {visitHref && (
          <a
            href={visitHref}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Visit platform <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
