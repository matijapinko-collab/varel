"use client";

import { useMemo, useState } from "react";
import { Field, Input, Textarea, Select } from "./ui";
import { seoChecks, score, type Check } from "@/lib/post-validation";

export type SeoPanelInitial = {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  schemaType: string;
  includeInSitemap: boolean;
};

/**
 * Shared SEO editor with a live Google snippet preview, score and checklist.
 * Inputs keep their `seo_*` names so the existing `saveSeoFromForm` server
 * actions (tools, pages, comparisons) continue to work untouched.
 */
export function SeoPanel({
  initial,
  title,
  slug,
  body,
  publicPath,
  siteUrl,
}: {
  initial: SeoPanelInitial;
  /** Content title/slug/body from the parent form — used for accurate scoring. */
  title: string;
  slug: string;
  body: string;
  publicPath: string;
  siteUrl: string;
}) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof SeoPanelInitial>(k: K, val: SeoPanelInitial[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const checks: Check[] = useMemo(
    () =>
      seoChecks({
        title,
        slug,
        body,
        seoTitle: v.metaTitle,
        seoDescription: v.metaDescription,
        focusKeyword: v.focusKeyword,
        canonicalUrl: v.canonicalUrl,
        robotsIndex: v.robots.startsWith("index"),
        // Fields the SEO checks do not read — filled to satisfy the shape.
        excerpt: "", featuredImageId: null, featuredImageAlt: "", primaryCategoryId: null,
        aiSummary: "", directAnswer: "", keyTakeaways: [], bestFor: [], notIdealFor: [],
        mentionedEntityIds: [], mentionedEntitiesText: "", faq: [], lastReviewedAt: null,
        reviewerId: null, prosConsEnabled: false, pros: [], cons: [],
        comparisonEnabled: false, comparisonToolAId: null, comparisonToolBId: null,
      }),
    [v, title, slug, body]
  );
  const seoScore = score(checks);
  const failing = checks.filter((c) => c.status !== "pass");

  const tone = seoScore >= 80 ? "text-emerald-600" : seoScore >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <details className="rounded-card border border-border bg-card" open={seoScore < 50}>
      <summary className="cursor-pointer px-6 py-4 text-base font-semibold">
        SEO settings <span className={tone}>({seoScore}/100)</span>
        {failing.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted">· {failing.length} to improve</span>
        )}
      </summary>

      <div className="space-y-4 border-t border-border p-6">
        {/* Google snippet preview */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="truncate text-[13px] text-green-700">
            {siteUrl}
            {publicPath}
          </div>
          <div className="truncate text-lg text-blue-800">
            {v.metaTitle || title || "Page title"}
          </div>
          <div className="line-clamp-2 text-sm text-gray-600">
            {v.metaDescription || "Add a meta description."}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Meta title (${v.metaTitle.length})`} hint="≤ 60 characters recommended">
            <Input
              name="seo_metaTitle"
              value={v.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
              maxLength={70}
            />
          </Field>
          <Field label="Focus keyword">
            <Input
              name="seo_focusKeyword"
              value={v.focusKeyword}
              onChange={(e) => set("focusKeyword", e.target.value)}
            />
          </Field>
        </div>

        <Field label={`Meta description (${v.metaDescription.length})`} hint="≤ 160 characters recommended">
          <Textarea
            name="seo_metaDescription"
            value={v.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
            rows={2}
            maxLength={200}
          />
        </Field>

        <Field label="Secondary keywords" hint="One per line">
          <Textarea
            name="seo_secondaryKeywords"
            value={v.secondaryKeywords}
            onChange={(e) => set("secondaryKeywords", e.target.value)}
            rows={2}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Canonical URL" hint="Leave empty for the default">
            <Input
              name="seo_canonicalUrl"
              value={v.canonicalUrl}
              onChange={(e) => set("canonicalUrl", e.target.value)}
            />
          </Field>
          <Field label="Robots">
            <Select name="seo_robots" value={v.robots} onChange={(e) => set("robots", e.target.value)}>
              <option value="index,follow">index, follow</option>
              <option value="noindex,follow">noindex, follow</option>
              <option value="index,nofollow">index, nofollow</option>
              <option value="noindex,nofollow">noindex, nofollow</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Open Graph title">
            <Input name="seo_ogTitle" value={v.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
          </Field>
          <Field label="Twitter title">
            <Input name="seo_twitterTitle" value={v.twitterTitle} onChange={(e) => set("twitterTitle", e.target.value)} />
          </Field>
        </div>

        <Field label="Open Graph description">
          <Textarea
            name="seo_ogDescription"
            value={v.ogDescription}
            onChange={(e) => set("ogDescription", e.target.value)}
            rows={2}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Schema type" hint="e.g. Article, Product, FAQPage">
            <Input name="seo_schemaType" value={v.schemaType} onChange={(e) => set("schemaType", e.target.value)} />
          </Field>
          <Field label="Include in sitemap">
            <Select
              name="seo_includeInSitemap"
              value={v.includeInSitemap ? "true" : "false"}
              onChange={(e) => set("includeInSitemap", e.target.value === "true")}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Field>
        </div>

        {/* Checklist */}
        <div className="rounded-lg border border-border bg-background-secondary p-3">
          <div className="mb-2 text-sm font-semibold">SEO checklist</div>
          <ul className="space-y-1">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                <span className={c.status === "pass" ? "text-emerald-600" : c.critical ? "text-red-500" : "text-amber-500"}>
                  {c.status === "pass" ? "✓" : c.critical ? "!" : "–"}
                </span>
                <span className={c.status === "pass" ? "text-muted" : ""}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
