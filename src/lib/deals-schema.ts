import { toNum, effectivePrice, selectBestOffer, type OfferInput } from "@/lib/deals";

type OfferRow = OfferInput & {
  availability: OfferInput["availability"];
  merchantName?: string | null;
  partner?: { name?: string; priority: number } | null;
};

function availabilitySchema(a: string): string {
  switch (a) {
    case "IN_STOCK": return "https://schema.org/InStock";
    case "OUT_OF_STOCK": return "https://schema.org/OutOfStock";
    case "LIMITED": return "https://schema.org/LimitedAvailability";
    case "PREORDER": return "https://schema.org/PreOrder";
    default: return "https://schema.org/InStock";
  }
}

/**
 * Product structured data with AggregateOffer (multiple offers) or a single
 * Offer. Returns null when there are no priced offers — so we never emit
 * misleading Offer markup for products without deals.
 */
export function productOfferJsonLd(opts: {
  name: string;
  description?: string;
  imageUrl?: string | null;
  rating?: number | null;
  offers: OfferRow[];
}): object | null {
  const priced = opts.offers.filter((o) => o.isActive && toNum(o.currentPrice) != null);
  if (!priced.length) return null;

  const prices = priced.map((o) => effectivePrice(o) ?? toNum(o.currentPrice)!);
  const currency = priced[0].currency || "EUR";
  const best = selectBestOffer(priced);

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    image: opts.imageUrl ?? undefined,
  };
  if (opts.rating != null) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: opts.rating,
      bestRating: 5,
      ratingCount: 1,
    };
  }

  if (priced.length === 1 && best) {
    base.offers = {
      "@type": "Offer",
      price: (effectivePrice(best) ?? toNum(best.currentPrice))!.toFixed(2),
      priceCurrency: currency,
      availability: availabilitySchema(best.availability),
      seller: best.merchantName || best.partner?.name ? { "@type": "Organization", name: best.merchantName ?? best.partner?.name } : undefined,
    };
  } else {
    base.offers = {
      "@type": "AggregateOffer",
      offerCount: priced.length,
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      priceCurrency: currency,
      availability: availabilitySchema(best?.availability ?? "IN_STOCK"),
    };
  }
  return base;
}
