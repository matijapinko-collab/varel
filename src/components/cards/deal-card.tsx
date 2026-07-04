/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { dealScore, formatPrice, toNum, type OfferInput } from "@/lib/deals";

// Minimal shape the card needs (matches getBestDeals include).
export type DealCardData = {
  id: string;
  brandName: string;
  newPrice: unknown;
  oldPrice: unknown;
  currency: string;
  discountPercent: number | null;
  offerId: string | null;
  affiliateLinkId: string | null;
  translations: { title: string; description: string | null }[];
  image: { url: string; altText: string | null } | null;
  partner: { name: string; slug: string } | null;
  offer: {
    id: string;
    availability: OfferInput["availability"];
    isActive: boolean;
    lastCheckedAt: Date | null;
    merchantName: string | null;
    couponCode: string | null;
    currentPrice: unknown;
    oldPrice: unknown;
    shippingCost: unknown;
    currency: string;
  } | null;
  product: {
    slug: string;
    editorRating: number | null;
    logo: { url: string; altText: string | null } | null;
    translations: { name: string; slug: string }[];
    categories: { category: { translations: { name: string }[]; slug: string } }[];
  } | null;
};

function dealHref(deal: DealCardData, locale: Locale): { href: string; external: boolean } {
  if (deal.offerId) return { href: `/o/${deal.offerId}`, external: true };
  if (deal.affiliateLinkId) return { href: `/go/${deal.affiliateLinkId}`, external: true };
  if (deal.product) {
    const slug = deal.product.translations[0]?.slug ?? deal.product.slug;
    return { href: `/${locale}/tools/${slug}`, external: false };
  }
  return { href: `/${locale}/best-deals`, external: false };
}

export function DealCard({ deal, locale }: { deal: DealCardData; locale: Locale }) {
  const t = getDictionary(locale);
  const tr = deal.translations[0];
  const title = tr?.title ?? deal.product?.translations[0]?.name ?? deal.brandName;
  const imageUrl = deal.image?.url ?? deal.product?.logo?.url ?? null;
  const category = deal.product?.categories[0]?.category.translations[0]?.name;
  const merchant = deal.offer?.merchantName ?? deal.partner?.name ?? deal.brandName;
  const { href, external } = dealHref(deal, locale);

  // Deal score from the linked offer, or synthesised from the deal's own prices.
  const scoreInput: OfferInput = deal.offer
    ? {
        id: deal.offer.id,
        currentPrice: deal.offer.currentPrice,
        oldPrice: deal.offer.oldPrice,
        shippingCost: deal.offer.shippingCost,
        currency: deal.offer.currency,
        couponCode: deal.offer.couponCode,
        availability: deal.offer.availability,
        isActive: deal.offer.isActive,
        lastCheckedAt: deal.offer.lastCheckedAt,
      }
    : {
        id: deal.id,
        currentPrice: deal.newPrice,
        oldPrice: deal.oldPrice,
        shippingCost: null,
        currency: deal.currency,
        couponCode: null,
        availability: "IN_STOCK",
        isActive: true,
        lastCheckedAt: null,
      };
  const score = dealScore(scoreInput);
  const price = formatPrice(deal.newPrice, deal.currency);
  const oldPrice = formatPrice(deal.oldPrice, deal.currency);
  const lastChecked = deal.offer?.lastCheckedAt ?? null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-background-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt={deal.image?.altText ?? title} className="max-h-full max-w-full object-contain p-4" loading="lazy" />
        ) : (
          <span className="text-3xl font-bold text-muted">{deal.brandName.slice(0, 2).toUpperCase()}</span>
        )}
        {deal.discountPercent != null && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            -{deal.discountPercent}%
          </span>
        )}
        <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold ${score.tone}`}>
          {score.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-semibold uppercase tracking-wide">{deal.brandName}</span>
          {category && <span>· {category}</span>}
        </div>
        <h3 className="mt-1.5 line-clamp-2 font-semibold group-hover:text-primary">{title}</h3>

        <div className="mt-3 flex items-baseline gap-2">
          {price && <span className="text-xl font-bold">{price}</span>}
          {oldPrice && <span className="text-sm text-muted line-through">{oldPrice}</span>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{t.deal_via} {merchant}</span>
          {deal.product?.editorRating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star size={11} fill="currentColor" className="text-primary" /> {deal.product.editorRating.toFixed(1)}
            </span>
          )}
        </div>
        {deal.offer?.couponCode && (
          <div className="mt-2 text-xs">
            <span className="rounded border border-dashed border-primary/50 bg-soft px-2 py-0.5 font-mono text-primary">
              {deal.offer.couponCode}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">
            {toNum(deal.offer?.currentPrice) != null && !deal.offer?.shippingCost ? `${t.shipping_may_vary} · ` : ""}
            {lastChecked ? `${t.last_checked} ${lastChecked.toLocaleDateString(locale)}` : t.partner_offer}
          </span>
        </div>

        <a
          href={href}
          {...(external ? { target: "_blank", rel: "nofollow sponsored noopener" } : {})}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t.check_deal} <ExternalLink size={14} />
        </a>
        <Link
          href={`/${locale}/best-deals`}
          className="mt-2 text-center text-[11px] text-muted hover:text-foreground"
        >
          {t.affiliate_link_label}
        </Link>
      </div>
    </div>
  );
}
