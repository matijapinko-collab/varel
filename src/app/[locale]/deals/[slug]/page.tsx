import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { TrackView } from "@/components/analytics/track-view";
import { buildSeoMetadata } from "@/lib/seo";

async function getDeal(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.dealTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      deal: { status: "PUBLISHED", deletedAt: null },
    },
    include: { deal: { include: { affiliateLink: true, image: true } } },
  });
}

export async function generateMetadata(
  props: PageProps<"/[locale]/deals/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const d = await getDeal(locale, slug);
  if (!d) return {};
  const seo = await getSeo("DEAL", d.dealId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: d.title,
    fallbackDescription: d.description ?? undefined,
    locale,
    path: `/deals/${d.slug}`,
  });
}

export default async function DealPage(props: PageProps<"/[locale]/deals/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const d = await getDeal(locale, slug);
  if (!d) notFound();
  const deal = d.deal;
  const href = deal.offerId
    ? `/o/${deal.offerId}`
    : deal.affiliateLink
      ? `/go/${deal.affiliateLink.id}`
      : "#";
  const end = deal.endsAt ?? deal.validUntil;
  const expired = end != null && end < new Date();

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <TrackView type="DEAL_CLICK" entityType="DEAL" entityId={deal.id} locale={locale} />
      <div className="rounded-card border border-border bg-card p-8">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            {deal.brandName}
          </span>
          <div className="flex items-center gap-2">
            {deal.discountPercent != null && (
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                -{deal.discountPercent}%
              </span>
            )}
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{d.title}</h1>
        {d.description && <p className="mt-3 text-muted">{d.description}</p>}

        <div className="mt-6 flex items-baseline gap-3">
          {deal.newPrice != null && (
            <span className="text-4xl font-bold">
              {deal.currency === "USD" ? "$" : deal.currency + " "}
              {String(deal.newPrice)}
            </span>
          )}
          {deal.oldPrice != null && (
            <span className="text-xl text-muted line-through">
              {deal.currency === "USD" ? "$" : deal.currency + " "}
              {String(deal.oldPrice)}
            </span>
          )}
        </div>
        {deal.validUntil && (
          <div className="mt-2 text-sm text-muted">
            {t.valid_until}: {deal.validUntil.toLocaleDateString(locale)}
          </div>
        )}

        {expired ? (
          <div className="mt-8 rounded-full border border-border bg-background-secondary px-6 py-3 text-center text-base font-semibold text-muted">
            {t.deal_expired}
          </div>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            {d.ctaText ?? t.get_deal}
          </a>
        )}
        <p className="mt-4 text-xs text-muted">{t.affiliate_disclosure_short}</p>
      </div>
    </article>
  );
}
