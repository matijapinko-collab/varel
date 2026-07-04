/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getToolOffers, getPriceContext } from "@/lib/deals-data";
import { PriceHistoryChart } from "./price-history-chart";
import { dealScore, discountPercent, formatPrice, isAvailable, type OfferInput } from "@/lib/deals";
import { AffiliateDisclosure } from "./affiliate-disclosure";

function availabilityLabel(a: string, t: ReturnType<typeof getDictionary>): string {
  switch (a) {
    case "IN_STOCK": return t.in_stock;
    case "OUT_OF_STOCK": return t.out_of_stock;
    case "LIMITED": return t.limited_stock;
    case "PREORDER": return t.preorder;
    default: return "—";
  }
}

/**
 * "Best current deal" box + full offer comparison table for a product (Tool).
 * Renders nothing if the product has no active offers.
 */
export async function ToolOffers({ toolId, locale }: { toolId: string; locale: Locale }) {
  const t = getDictionary(locale);
  const { offers, best } = await getToolOffers(toolId);
  if (!offers.length || !best) return null;
  const priceContext = await getPriceContext(toolId, best.id);

  const asInput = (o: (typeof offers)[number]): OfferInput => ({
    id: o.id,
    currentPrice: o.currentPrice,
    oldPrice: o.oldPrice,
    shippingCost: o.shippingCost,
    currency: o.currency,
    couponCode: o.couponCode,
    availability: o.availability,
    isActive: o.isActive,
    lastCheckedAt: o.lastCheckedAt,
    partner: o.partner ? { priority: o.partner.priority } : null,
  });

  const bestScore = dealScore(asInput(best), {
    lowest30d: priceContext?.lowest30d ?? null,
  });
  const bestDiscount = discountPercent(best);

  return (
    <section className="mt-8">
      {/* Best current deal box */}
      <div className="rounded-card border border-primary/30 bg-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t.best_current_deal}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatPrice(best.currentPrice, best.currency) ?? "—"}</span>
              {best.oldPrice != null && (
                <span className="text-sm text-muted line-through">
                  {formatPrice(best.oldPrice, best.currency)}
                </span>
              )}
              {bestDiscount != null && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  -{bestDiscount}%
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>{t.deal_via} {best.merchantName ?? best.partner?.name}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${bestScore.tone}`}>{bestScore.label}</span>
              <span>{availabilityLabel(best.availability, t)}</span>
              {best.lastCheckedAt && <span>· {t.last_checked} {best.lastCheckedAt.toLocaleDateString(locale)}</span>}
              {!best.shippingCost && <span>· {t.shipping_may_vary}</span>}
            </div>
            {priceContext?.lowest30d != null && (
              <div className="mt-1 text-xs text-muted">
                {t.lowest_30d}: {formatPrice(priceContext.lowest30d, priceContext.currency)}
                {priceContext.direction === "down" && (
                  <span className="ml-1.5 text-green-600 dark:text-green-400">↓ {t.price_dropped}</span>
                )}
                {priceContext.direction === "up" && (
                  <span className="ml-1.5 text-orange-600 dark:text-orange-400">↑ {t.price_increased}</span>
                )}
              </div>
            )}
          </div>
          <a
            href={`/o/${best.id}`}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t.check_price} <ExternalLink size={15} />
          </a>
        </div>
      </div>

      {/* Comparison table when there are multiple offers */}
      {offers.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-card border border-border text-sm">
            <thead>
              <tr className="bg-background-secondary text-left">
                <th className="border-b border-border px-4 py-3 font-semibold">{t.merchant}</th>
                <th className="border-b border-border px-4 py-3 font-semibold">{t.pricing}</th>
                <th className="border-b border-border px-4 py-3 font-semibold">{t.shipping}</th>
                <th className="border-b border-border px-4 py-3 font-semibold">{t.coupon}</th>
                <th className="border-b border-border px-4 py-3 font-semibold">{t.availability}</th>
                <th className="border-b border-border px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className={o.id === best.id ? "bg-soft/60" : "odd:bg-card even:bg-background-secondary/40"}
                >
                  <td className="border-b border-border px-4 py-3 font-medium">
                    {o.merchantName ?? o.partner?.name}
                    {o.id === best.id && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        BEST
                      </span>
                    )}
                    {o.sponsored && <span className="ml-2 text-[10px] uppercase text-muted">Sponsored</span>}
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    <span className="font-semibold">{formatPrice(o.currentPrice, o.currency) ?? "—"}</span>
                    {o.oldPrice != null && (
                      <span className="ml-1 text-xs text-muted line-through">{formatPrice(o.oldPrice, o.currency)}</span>
                    )}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted">
                    {o.shippingCost != null ? (formatPrice(o.shippingCost, o.currency) || "—") : t.shipping_may_vary}
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    {o.couponCode ? (
                      <span className="rounded border border-dashed border-primary/50 px-1.5 py-0.5 font-mono text-xs text-primary">
                        {o.couponCode}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    <span className={isAvailable(o) ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                      {availabilityLabel(o.availability, t)}
                    </span>
                  </td>
                  <td className="border-b border-border px-4 py-3 text-right">
                    <a
                      href={`/o/${o.id}`}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {t.check_price}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Price history chart (Phase 3) — renders once ≥2 daily points exist */}
      <PriceHistoryChart toolId={toolId} locale={locale} />

      <AffiliateDisclosure locale={locale} className="mt-3" />
    </section>
  );
}
