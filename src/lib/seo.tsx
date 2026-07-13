import type { Metadata } from "next";
import type { SeoMetadata } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Builds Next.js Metadata from a seo_metadata row with sensible fallbacks.
 * `path` is the locale-relative path (e.g. "/tools/claude") used for
 * canonical + hreflang alternates.
 */
export function buildSeoMetadata({
  seo,
  fallbackTitle,
  fallbackDescription,
  locale,
  path,
  ogImageUrl,
}: {
  seo?: SeoMetadata | null;
  fallbackTitle: string;
  fallbackDescription?: string;
  locale: Locale;
  path: string;
  ogImageUrl?: string | null;
}): Metadata {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const title = seo?.metaTitle ?? fallbackTitle;
  const description = seo?.metaDescription ?? fallbackDescription;
  const canonical = seo?.canonicalUrl ?? `${site}/${locale}${path}`;

  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) {
    languages[l] = `${site}/${l}${path}`;
  }
  languages["x-default"] = `${site}/en${path}`;

  const robotsValue = seo?.robots ?? "index,follow";

  return {
    title,
    description,
    alternates: { canonical, languages },
    robots: {
      index: !robotsValue.includes("noindex"),
      follow: !robotsValue.includes("nofollow"),
    },
    openGraph: {
      title: seo?.ogTitle ?? title,
      description: seo?.ogDescription ?? description ?? undefined,
      url: canonical,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.twitterTitle ?? title,
      description: seo?.twitterDescription ?? description ?? undefined,
    },
  };
}

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  authorImage?: string | null;
  authorSameAs?: string[];
  datePublished?: Date | null;
  dateModified?: Date | null;
  image?: string | null;
  url: string;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description ?? undefined,
    image: opts.image ?? undefined,
    author: opts.authorName
      ? {
          "@type": "Person",
          name: opts.authorName,
          url: opts.authorUrl ?? undefined,
          image: opts.authorImage ?? undefined,
          sameAs: opts.authorSameAs && opts.authorSameAs.length ? opts.authorSameAs : [],
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Varel",
      url: site,
    },
    datePublished: opts.datePublished?.toISOString(),
    dateModified: opts.dateModified?.toISOString(),
    mainEntityOfPage: opts.url,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
