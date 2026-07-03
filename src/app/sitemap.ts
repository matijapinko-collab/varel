import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

/**
 * Sitemap generated from published content in every enabled language.
 * SEO settings (includeInSitemap) are respected via robots directives
 * on the pages themselves; noindexed system routes are excluded here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [];

  try {
    const languages = await db.language.findMany({ where: { isEnabled: true } });
    const langById = new Map(languages.map((l) => [l.id, l.code]));
    const codes = languages.map((l) => l.code);

    for (const code of codes) {
      entries.push({ url: `${site}/${code}`, changeFrequency: "daily", priority: 1 });
      for (const section of ["tools", "categories", "compare", "guides", "editorial", "news", "prompts", "deals"]) {
        entries.push({
          url: `${site}/${code}/${section}`,
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }

    const [pages, toolTrs, catTrs, cmpTrs, artTrs, edTrs, newsTrs, promptTrs, dealTrs] =
      await Promise.all([
        db.page.findMany({
          where: { status: "PUBLISHED", deletedAt: null, isHomepage: false },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.toolTranslation.findMany({
          where: { status: "PUBLISHED", tool: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.categoryTranslation.findMany({
          where: { category: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.comparisonTranslation.findMany({
          where: { status: "PUBLISHED", comparison: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.articleTranslation.findMany({
          where: { status: "PUBLISHED", article: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.editorialTranslation.findMany({
          where: { status: "PUBLISHED", editorialPost: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.newsTranslation.findMany({
          where: { status: "PUBLISHED", newsItem: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.promptTranslation.findMany({
          where: { status: "PUBLISHED", prompt: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
        db.dealTranslation.findMany({
          where: { status: "PUBLISHED", deal: { status: "PUBLISHED", deletedAt: null } },
          select: { slug: true, languageId: true, updatedAt: true },
        }),
      ]);

    const add = (
      rows: { slug: string; languageId: string; updatedAt: Date }[],
      prefix: string,
      priority: number
    ) => {
      for (const row of rows) {
        const code = langById.get(row.languageId);
        if (!code) continue;
        entries.push({
          url: `${site}/${code}${prefix}/${row.slug}`,
          lastModified: row.updatedAt,
          changeFrequency: "weekly",
          priority,
        });
      }
    };

    add(pages, "", 0.6);
    add(toolTrs, "/tools", 0.9);
    add(catTrs, "/categories", 0.7);
    add(cmpTrs, "/compare", 0.9);
    add(artTrs, "/guides", 0.8);
    add(edTrs, "/editorial", 0.7);
    add(newsTrs, "/news", 0.6);
    add(promptTrs, "/prompts", 0.6);
    add(dealTrs, "/deals", 0.6);
  } catch (e) {
    // DB unavailable at build time — return the static shell.
    console.error("sitemap generation fallback", e);
  }

  return entries;
}
