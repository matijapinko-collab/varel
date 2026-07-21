import "server-only";
import { db } from "@/lib/db";
import { getLanguage } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";

/** Shared post query used by both the category URL and the legacy /guides URL. */
export async function getGuide(locale: Locale, slug: string, previewArticleId?: string | null) {
  const language = await getLanguage(locale);
  if (!language) return null;
  const toolInclude = {
    include: { logo: true, translations: { where: { languageId: language.id } } },
  };
  return db.articleTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      // A valid preview token unlocks exactly one article, regardless of status.
      ...(previewArticleId
        ? { articleId: previewArticleId, article: { deletedAt: null } }
        : { status: "PUBLISHED", article: { status: "PUBLISHED", deletedAt: null } }),
    },
    include: {
      article: {
        include: {
          author: true,
          authorProfile: true,
          reviewer: true,
          featuredImage: true,
          comparisonToolA: toolInclude,
          comparisonToolB: toolInclude,
          primaryCategory: { include: { translations: { where: { languageId: language.id } } } },
          tools: {
            orderBy: { position: "asc" },
            include: {
              tool: {
                include: {
                  logo: true,
                  translations: { where: { languageId: language.id } },
                  categories: {
                    include: {
                      category: {
                        include: {
                          translations: { where: { languageId: language.id } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export type GuideRecord = NonNullable<Awaited<ReturnType<typeof getGuide>>>;
