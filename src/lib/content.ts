import { cache } from "react";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import type { MenuLocation } from "@/generated/prisma/client";

/**
 * Read helpers for public pages. All content comes from the database
 * (CMS-managed) — nothing is hardcoded. `cache` deduplicates queries
 * within a single request.
 */

export const getLanguage = cache(async (code: Locale) => {
  return db.language.findUnique({ where: { code } });
});

export const getEnabledLanguages = cache(async () => {
  return db.language.findMany({
    where: { isEnabled: true },
    orderBy: { position: "asc" },
  });
});

export const getMenu = cache(async (locale: Locale, location: MenuLocation) => {
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
});

/** Homepage = the page flagged isHomepage for this language. */
export const getHomepage = cache(async (locale: Locale) => {
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
});

export const getPageBySlug = cache(async (locale: Locale, slug: string) => {
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
});

/** SEO metadata lookup for any entity. */
export const getSeo = cache(
  async (entityType: string, entityId: string, locale: Locale) => {
    const language = await getLanguage(locale);
    if (!language) return null;
    return db.seoMetadata.findFirst({
      where: {
        entityType: entityType as never,
        entityId,
        languageId: language.id,
      },
    });
  }
);

export const getPublishedTools = cache(
  async (
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
  }
);

export const getCategories = cache(
  async (locale: Locale, opts: { featured?: boolean; take?: number } = {}) => {
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
  }
);
