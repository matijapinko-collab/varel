import { cache } from "react";
import { cachePublic } from "@/lib/cache";
import { db } from "@/lib/db";
import { postCategorySelect } from "@/lib/post-url";
import type { Locale } from "@/lib/i18n/config";
import type { MenuLocation } from "@/generated/prisma/client";

/**
 * Read helpers for public pages. All content comes from the database
 * (CMS-managed) — nothing is hardcoded. `cache` deduplicates queries
 * within a single request.
 */

export const getLanguage = cache(cachePublic(async (code: Locale) => {
  return db.language.findUnique({ where: { code } });
}, ["getLanguage"]));

export const getEnabledLanguages = cache(cachePublic(async () => {
  return db.language.findMany({
    where: { isEnabled: true },
    orderBy: { position: "asc" },
  });
}, ["getEnabledLanguages"]));

export const getMenu = cache(cachePublic(async (locale: Locale, location: MenuLocation) => {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.menu.findUnique({
    where: { location_languageId: { location, languageId: language.id } },
    include: {
      items: {
        where: { parentItemId: null },
        orderBy: { position: "asc" },
        include: { childItems: { orderBy: { position: "asc" } } },
      },
    },
  });
}, ["getMenu"]));

/** Homepage = the page flagged isHomepage for this language. */
export const getHomepage = cache(cachePublic(async (locale: Locale) => {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.page.findFirst({
    where: {
      languageId: language.id,
      isHomepage: true,
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      blocks: {
        where: { isHidden: false, parentBlockId: null },
        orderBy: { position: "asc" },
        include: {
          globalSection: {
            include: {
              blocks: { where: { isHidden: false }, orderBy: { position: "asc" } },
            },
          },
        },
      },
    },
  });
}, ["getHomepage"]));

export const getPageBySlug = cache(cachePublic(async (locale: Locale, slug: string) => {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.page.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      blocks: {
        where: { isHidden: false, parentBlockId: null },
        orderBy: { position: "asc" },
        include: {
          globalSection: {
            include: {
              blocks: { where: { isHidden: false }, orderBy: { position: "asc" } },
            },
          },
        },
      },
    },
  });
}, ["getPageBySlug"]));

/** SEO metadata lookup for any entity. */
export const getSeo = cache(
  cachePublic(async (entityType: string, entityId: string, locale: Locale) => {
    const language = await getLanguage(locale);
    if (!language) return null;
    return db.seoMetadata.findFirst({
      where: {
        entityType: entityType as never,
        entityId,
        languageId: language.id,
      },
    });
  }, ["getSeo"])
);

export const getPublishedTools = cache(
  cachePublic(async (
    locale: Locale,
    opts: {
      take?: number;
      categorySlug?: string;
      featured?: boolean;
      trending?: boolean;
      query?: string;
    } = {}
  ) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.tool.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        ...(opts.featured ? { isFeatured: true } : {}),
        ...(opts.trending ? { isTrending: true } : {}),
        ...(opts.categorySlug
          ? { categories: { some: { category: { slug: opts.categorySlug } } } }
          : {}),
        ...(opts.query
          ? {
              OR: [
                { name: { contains: opts.query, mode: "insensitive" } },
                {
                  translations: {
                    some: {
                      languageId: language.id,
                      OR: [
                        { name: { contains: opts.query, mode: "insensitive" } },
                        {
                          shortDescription: {
                            contains: opts.query,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        logo: true,
        translations: { where: { languageId: language.id } },
        categories: {
          include: {
            category: {
              include: { translations: { where: { languageId: language.id } } },
            },
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { editorRating: "desc" }],
      take: opts.take ?? 24,
    });
  }, ["getPublishedTools"])
);

export const getCategories = cache(
  cachePublic(async (locale: Locale, opts: { featured?: boolean; take?: number } = {}) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.category.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        ...(opts.featured ? { isFeatured: true } : {}),
      },
      include: {
        translations: { where: { languageId: language.id } },
        _count: { select: { tools: true } },
      },
      orderBy: { position: "asc" },
      take: opts.take,
    });
  }, ["getCategories"])
);

/**
 * Homepage "latest …" block data. Extracted from the block renderer so each
 * query is cached across requests — the homepage fires all of these on every
 * visit. Consumers must treat any date field as possibly a string (see cache.ts):
 * wrap it in `new Date(...)` before formatting.
 */
export const getLatestArticlesBlock = cache(
  cachePublic(async (locale: Locale, take: number) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.articleTranslation.findMany({
      where: {
        languageId: language.id,
        status: "PUBLISHED",
        article: { status: "PUBLISHED", deletedAt: null },
      },
      include: { article: { include: postCategorySelect } },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }, ["getLatestArticlesBlock"])
);

export const getLatestComparisonsBlock = cache(
  cachePublic(async (locale: Locale, take: number) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.comparisonTranslation.findMany({
      where: {
        languageId: language.id,
        status: "PUBLISHED",
        comparison: { status: "PUBLISHED", deletedAt: null },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }, ["getLatestComparisonsBlock"])
);

export const getFeaturedEditorialBlock = cache(
  cachePublic(async (locale: Locale) => {
    const language = await getLanguage(locale);
    if (!language) return null;
    return db.editorialTranslation.findFirst({
      where: {
        languageId: language.id,
        status: "PUBLISHED",
        editorialPost: { status: "PUBLISHED", deletedAt: null },
      },
      include: { editorialPost: { include: { author: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }, ["getFeaturedEditorialBlock"])
);

export const getLatestNewsBlock = cache(
  cachePublic(async (locale: Locale, take: number) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.newsTranslation.findMany({
      where: {
        languageId: language.id,
        status: "PUBLISHED",
        newsItem: { status: "PUBLISHED", deletedAt: null },
      },
      include: { newsItem: true },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }, ["getLatestNewsBlock"])
);

export const getLatestDealsBlock = cache(
  cachePublic(async (locale: Locale, take: number) => {
    const language = await getLanguage(locale);
    if (!language) return [];
    return db.dealTranslation.findMany({
      where: {
        languageId: language.id,
        status: "PUBLISHED",
        deal: { status: "PUBLISHED", deletedAt: null },
      },
      include: { deal: true },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }, ["getLatestDealsBlock"])
);
