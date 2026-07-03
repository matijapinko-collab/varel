import { db } from "@/lib/db";
import { Field, Input, Textarea, Select } from "./ui";
import type { SeoEntityType } from "@/generated/prisma/client";

/**
 * Shared SEO editor rendered inside every content form (collapsible).
 * Saved by the module's server action via `saveSeoFromForm`.
 */
export async function SeoFields({
  entityType,
  entityId,
  languageId,
}: {
  entityType: SeoEntityType;
  entityId: string;
  languageId: string;
}) {
  const seo = await db.seoMetadata.findFirst({
    where: { entityType, entityId, languageId },
  });

  return (
    <details className="rounded-card border border-border bg-card">
      <summary className="cursor-pointer px-6 py-4 text-base font-semibold">
        SEO settings {seo?.metaTitle ? "✓" : "· not set"}
      </summary>
      <div className="space-y-4 border-t border-border p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meta title" hint="≤ 60 characters recommended">
            <Input name="seo_metaTitle" defaultValue={seo?.metaTitle ?? ""} maxLength={70} />
          </Field>
          <Field label="Focus keyword">
            <Input name="seo_focusKeyword" defaultValue={seo?.focusKeyword ?? ""} />
          </Field>
        </div>
        <Field label="Meta description" hint="≤ 160 characters recommended">
          <Textarea
            name="seo_metaDescription"
            defaultValue={seo?.metaDescription ?? ""}
            rows={2}
            maxLength={200}
          />
        </Field>
        <Field label="Secondary keywords" hint="One per line">
          <Textarea
            name="seo_secondaryKeywords"
            defaultValue={
              Array.isArray(seo?.secondaryKeywordsJson)
                ? (seo.secondaryKeywordsJson as string[]).join("\n")
                : ""
            }
            rows={2}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Canonical URL" hint="Leave empty for the default">
            <Input name="seo_canonicalUrl" defaultValue={seo?.canonicalUrl ?? ""} />
          </Field>
          <Field label="Robots">
            <Select name="seo_robots" defaultValue={seo?.robots ?? "index,follow"}>
              <option value="index,follow">index, follow</option>
              <option value="noindex,follow">noindex, follow</option>
              <option value="index,nofollow">index, nofollow</option>
              <option value="noindex,nofollow">noindex, nofollow</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Open Graph title">
            <Input name="seo_ogTitle" defaultValue={seo?.ogTitle ?? ""} />
          </Field>
          <Field label="Twitter title">
            <Input name="seo_twitterTitle" defaultValue={seo?.twitterTitle ?? ""} />
          </Field>
        </div>
        <Field label="Open Graph description">
          <Textarea name="seo_ogDescription" defaultValue={seo?.ogDescription ?? ""} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Schema type" hint="e.g. Article, Product, FAQPage">
            <Input name="seo_schemaType" defaultValue={seo?.schemaType ?? ""} />
          </Field>
          <Field label="Include in sitemap">
            <Select
              name="seo_includeInSitemap"
              defaultValue={seo?.includeInSitemap === false ? "false" : "true"}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Field>
        </div>
      </div>
    </details>
  );
}
