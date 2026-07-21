import { db } from "@/lib/db";
import { SeoPanel } from "./seo-panel";
import type { SeoEntityType } from "@/generated/prisma/client";

/**
 * Shared SEO editor rendered inside every content form (collapsible).
 * Loads the stored metadata and hands it to the client panel, which adds a
 * live Google preview, score and checklist. Saved by the module's server
 * action via `saveSeoFromForm` — the input names are unchanged.
 */
export async function SeoFields({
  entityType,
  entityId,
  languageId,
  title = "",
  slug = "",
  body = "",
  publicPath = "",
}: {
  entityType: SeoEntityType;
  entityId: string;
  languageId: string;
  /** Optional context from the parent form so the score reflects real content. */
  title?: string;
  slug?: string;
  body?: string;
  /** Public URL path shown in the snippet preview, e.g. "/en/tools/foo". */
  publicPath?: string;
}) {
  const seo = await db.seoMetadata.findFirst({
    where: { entityType, entityId, languageId },
  });

  return (
    <SeoPanel
      title={title}
      slug={slug}
      body={body}
      publicPath={publicPath}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      initial={{
        metaTitle: seo?.metaTitle ?? "",
        metaDescription: seo?.metaDescription ?? "",
        focusKeyword: seo?.focusKeyword ?? "",
        secondaryKeywords: Array.isArray(seo?.secondaryKeywordsJson)
          ? (seo.secondaryKeywordsJson as string[]).join("\n")
          : "",
        canonicalUrl: seo?.canonicalUrl ?? "",
        robots: seo?.robots ?? "index,follow",
        ogTitle: seo?.ogTitle ?? "",
        ogDescription: seo?.ogDescription ?? "",
        twitterTitle: seo?.twitterTitle ?? "",
        schemaType: seo?.schemaType ?? "",
        includeInSitemap: seo?.includeInSitemap !== false,
      }}
    />
  );
}
