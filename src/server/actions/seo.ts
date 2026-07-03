import "server-only";
import { db } from "@/lib/db";
import { fd, fdLines } from "./helpers";
import type { SeoEntityType } from "@/generated/prisma/client";

/**
 * Upserts seo_metadata from the shared SeoFields form section.
 * Called inside module server actions after the content itself is saved.
 */
export async function saveSeoFromForm(
  form: FormData,
  entityType: SeoEntityType,
  entityId: string,
  languageId: string
) {
  // Skip entirely if the SEO section was never touched (all fields empty).
  const metaTitle = fd(form, "seo_metaTitle");
  const metaDescription = fd(form, "seo_metaDescription");
  const focusKeyword = fd(form, "seo_focusKeyword");
  const hasAny =
    metaTitle || metaDescription || focusKeyword || fd(form, "seo_canonicalUrl") ||
    fd(form, "seo_ogTitle") || fd(form, "seo_schemaType");
  const existing = await db.seoMetadata.findFirst({
    where: { entityType, entityId, languageId },
    select: { id: true },
  });
  if (!hasAny && !existing) return;

  const data = {
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    focusKeyword: focusKeyword || null,
    secondaryKeywordsJson: fdLines(form, "seo_secondaryKeywords"),
    canonicalUrl: fd(form, "seo_canonicalUrl") || null,
    ogTitle: fd(form, "seo_ogTitle") || null,
    ogDescription: fd(form, "seo_ogDescription") || null,
    twitterTitle: fd(form, "seo_twitterTitle") || null,
    robots: fd(form, "seo_robots") || "index,follow",
    schemaType: fd(form, "seo_schemaType") || null,
    includeInSitemap: fd(form, "seo_includeInSitemap") !== "false",
  };

  await db.seoMetadata.upsert({
    where: {
      entityType_entityId_languageId: { entityType, entityId, languageId },
    },
    create: { entityType, entityId, languageId, ...data },
    update: data,
  });
}
