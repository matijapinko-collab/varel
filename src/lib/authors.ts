import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import type { Author } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";

/**
 * Localized public author (byline) helpers.
 *
 * The same Author record is shown differently per locale: on /hr the Croatian
 * display name/role/bio/slug are used ("Matija Pinko"), on /en the English ones
 * ("Matt Pinko"). Fallback rules: if the requested locale's field is empty,
 * fall back to the other locale so the page never renders blank.
 */

export type LocalizedAuthor = {
  id: string;
  displayName: string;
  role: string | null;
  bioShort: string | null;
  bioLong: string | null;
  slug: string;
  expertise: string[];
  photoUrl: string | null;
  photoAlt: string;
  aboutPhotoUrl: string | null;
  aboutPhotoAlt: string;
  email: string | null;
  socials: { key: string; url: string; label: string }[];
  /** Locale-relative path, e.g. "/hr/autori/matija-pinko" or "/en/authors/matt-pinko". */
  path: string;
  /** Absolute profile URL. */
  url: string;
  isDefault: boolean;
  isActive: boolean;
};

function pick(en: string | null | undefined, hr: string | null | undefined, locale: Locale): string | null {
  const primary = locale === "hr" ? hr : en;
  const secondary = locale === "hr" ? en : hr;
  return (primary && primary.trim()) || (secondary && secondary.trim()) || null;
}

function toStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
}

/** Locale-relative author path. HR uses /autori/<slugHr>; everything else /authors/<slugEn>. */
export function authorPath(locale: Locale, author: Pick<Author, "slugEn" | "slugHr">): string {
  if (locale === "hr") return `/hr/autori/${author.slugHr}`;
  return `/${locale}/authors/${author.slugEn}`;
}

const SOCIAL_LABEL: Record<string, { en: string; hr: string }> = {
  website: { en: "website", hr: "web stranica" },
  linkedin: { en: "on LinkedIn", hr: "na LinkedInu" },
  x: { en: "on X", hr: "na X-u" },
  instagram: { en: "on Instagram", hr: "na Instagramu" },
  youtube: { en: "on YouTube", hr: "na YouTubeu" },
  github: { en: "on GitHub", hr: "na GitHubu" },
};

export function localizeAuthor(author: Author, locale: Locale): LocalizedAuthor {
  const displayName =
    pick(author.displayNameEn, author.displayNameHr, locale) ?? author.internalName;
  const expertise = locale === "hr"
    ? (toStrings(author.expertiseTagsHrJson).length ? toStrings(author.expertiseTagsHrJson) : toStrings(author.expertiseTagsEnJson))
    : (toStrings(author.expertiseTagsEnJson).length ? toStrings(author.expertiseTagsEnJson) : toStrings(author.expertiseTagsHrJson));

  const defaultAlt = locale === "hr"
    ? `Fotografija ${displayName}, ${pick(author.roleEn, author.roleHr, locale) ?? "autora na Varelu"}`
    : `Photo of ${displayName}, ${pick(author.roleEn, author.roleHr, locale) ?? "author at Varel"}`;

  const socials: { key: string; url: string; label: string }[] = [];
  const add = (key: keyof typeof SOCIAL_LABEL, url: string | null) => {
    if (url && url.trim()) {
      const l = SOCIAL_LABEL[key];
      socials.push({ key, url: url.trim(), label: `${displayName} ${locale === "hr" ? l.hr : l.en}` });
    }
  };
  add("website", author.websiteUrl);
  add("linkedin", author.linkedinUrl);
  add("x", author.xUrl);
  add("instagram", author.instagramUrl);
  add("youtube", author.youtubeUrl);
  add("github", author.githubUrl);

  const path = authorPath(locale, author);

  return {
    id: author.id,
    displayName,
    role: pick(author.roleEn, author.roleHr, locale),
    bioShort: pick(author.bioShortEn, author.bioShortHr, locale),
    bioLong: pick(author.bioLongEn, author.bioLongHr, locale),
    slug: locale === "hr" ? author.slugHr : author.slugEn,
    expertise,
    photoUrl: author.photoUrl,
    photoAlt: (locale === "hr" ? author.photoAltHr : author.photoAltEn)?.trim() || defaultAlt,
    aboutPhotoUrl: author.aboutPhotoUrl || author.photoUrl,
    aboutPhotoAlt: (locale === "hr" ? author.aboutPhotoAltHr : author.aboutPhotoAltEn)?.trim() || defaultAlt,
    email: author.email,
    socials,
    path,
    url: `${siteUrl()}${path}`,
    isDefault: author.isDefault,
    isActive: author.isActive,
  };
}

/* ---------------- localized labels ---------------- */

export type AuthorLabels = {
  writtenBy: string;
  by: string;
  viewProfile: string;
  expertise: string;
  updated: string;
  lastTested: string;
  pricingChecked: string;
  reviewedBy: string;
  latestPosts: string;
  articlesBy: string;
};

export function authorLabels(locale: Locale): AuthorLabels {
  if (locale === "hr") {
    return {
      writtenBy: "Autor",
      by: "Autor",
      viewProfile: "Pogledaj profil autora",
      expertise: "Stručnost",
      updated: "Ažurirano",
      lastTested: "Zadnje testirano",
      pricingChecked: "Cijena provjerena",
      reviewedBy: "Recenzirao",
      latestPosts: "Najnoviji članci",
      articlesBy: "Članci autora",
    };
  }
  return {
    writtenBy: "Written by",
    by: "By",
    viewProfile: "View author profile",
    expertise: "Expertise",
    updated: "Updated",
    lastTested: "Last tested",
    pricingChecked: "Pricing checked",
    reviewedBy: "Reviewed by",
    latestPosts: "Latest posts",
    articlesBy: "Articles by",
  };
}

/* ---------------- data access ---------------- */

export async function getDefaultAuthor(): Promise<Author | null> {
  return (
    (await db.author.findFirst({ where: { isDefault: true, isActive: true } })) ??
    (await db.author.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }))
  );
}

/** Resolve the author to display for an article: its own author profile, else the default. */
export async function resolveArticleAuthor(authorProfile: Author | null | undefined): Promise<Author | null> {
  if (authorProfile && authorProfile.isActive) return authorProfile;
  return getDefaultAuthor();
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  return db.author.findFirst({
    where: { isActive: true, OR: [{ slugEn: slug }, { slugHr: slug }] },
  });
}

export async function getActiveAuthors(): Promise<Author[]> {
  return db.author.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { internalName: "asc" }] });
}

/* ---------------- structured data ---------------- */

export function authorPersonJsonLd(author: Author, locale: Locale): object {
  const a = localizeAuthor(author, locale);
  const sameAs = a.socials.map((s) => s.url);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: a.displayName,
    url: a.url,
    image: a.photoUrl ?? undefined,
    jobTitle: a.role ?? undefined,
    email: a.email ?? undefined,
    worksFor: { "@type": "Organization", name: "Varel", url: siteUrl() },
    knowsAbout: a.expertise.length ? a.expertise : undefined,
    sameAs: sameAs.length ? sameAs : [],
  };
}

/* ---------------- content settings ---------------- */

export type ContentSettings = {
  authorBoxOnArticles: boolean;
  authorBoxOnReviews: boolean;
  authorBoxOnComparisons: boolean;
  compactAuthorUnderTitle: boolean;
  requireAuthorBeforePublishing: boolean;
  defaultAuthorId: string | null;
};

export const DEFAULT_CONTENT_SETTINGS: ContentSettings = {
  authorBoxOnArticles: true,
  authorBoxOnReviews: true,
  authorBoxOnComparisons: true,
  compactAuthorUnderTitle: true,
  requireAuthorBeforePublishing: true,
  defaultAuthorId: null,
};

export const CONTENT_SETTINGS_KEY = "content";

export async function getContentSettings(): Promise<ContentSettings> {
  const raw = await getSetting<Partial<ContentSettings>>(CONTENT_SETTINGS_KEY).catch(() => null);
  return { ...DEFAULT_CONTENT_SETTINGS, ...(raw ?? {}) };
}
