import { cache } from "react";
import { db } from "@/lib/db";
import { getLanguage } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import { discountPercent, effectivePrice, toNum, selectBestOffer, type OfferInput } from "@/lib/deals";

export type DealSort = "newest" | "discount" | "price" | "rating";

const dealInclude = (languageId: string) => ({
  translations: { where: { languageId } },
  image: true,
  partner: { include: { logo: true } },
  offer: true,
  product: {
    include: {
      logo: true,
      translations: { where: { languageId } },
      categories: {
        include: { category: { include: { translations: { where: { languageId } } } } },
      },
    },
  },
});

export const getBestDeals = cache(
  async (
    locale: Locale,
    opts: {
      take?: number;
      featured?: boolean;
      categorySlug?: string;
      brand?: string;
      minDiscount?: number;
      sort?: DealSort;
    } = {}
  ) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    const now = new Date();

    let deals = await db.deal.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        ...(opts.featured ? { isFeatured: true } : {}),
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        translations: { some: { languageId: language.id } },
        ...(opts.categorySlug
          ? { product: { categories: { some: { category: { slug: opts.categorySlug } } } } }
          : {}),
        ...(opts.brand ? { brandName: opts.brand } : {}),
      },
      include: dealInclude(language.id),
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: opts.take ?? 100,
    });

    if (opts.minDiscount && opts.minDiscount > 0) {
      deals = deals.filter((d) => (d.discountPercent ?? 0) >= opts.minDiscount!);
    }

    const sort = opts.sort ?? "newest";
    if (sort === "discount") {
      deals.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    } else if (sort === "price") {
      deals.sort((a, b) => (toNum(a.newPrice) ?? Infinity) - (toNum(b.newPrice) ?? Infinity));
    } else if (sort === "rating") {
      deals.sort((a, b) => (b.product?.editorRating ?? 0) - (a.product?.editorRating ?? 0));
    }
    return deals;
  }
);

/** Distinct brands + product categories present in published deals (for filters). */
export const getDealFacets = cache(async () => {
  const now = new Date();
  const deals = await db.deal.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    select: {
      brandName: true,
      product: { select: { categories: { select: { category: { select: { slug: true } } } } } },
    },
  });
  const brands = new Set<string>();
  const categories = new Set<string>();
  for (const d of deals) {
    if (d.brandName) brands.add(d.brandName);
    for (const c of d.product?.categories ?? []) categories.add(c.category.slug);
  }
  return { brands: [...brands].sort(), categories: [...categories].sort() };
});

/** Active offers for a product (Tool), best offer first. */
export const getToolOffers = cache(async (toolId: string) => {
  const offers = await db.productOffer.findMany({
    where: { toolId, isActive: true },
    include: { partner: { include: { logo: true } } },
    orderBy: { currentPrice: "asc" },
  });
  const best = selectBestOffer(offers as unknown as (OfferInput & (typeof offers)[number])[]);
  return { offers, best, bestId: best?.id ?? null };
});

export { discountPercent, effectivePrice };
