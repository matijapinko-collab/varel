import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { getLanguage } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import { getAuthorBySlug, localizeAuthor, authorLabels, authorPersonJsonLd, siteUrl } from "@/lib/authors";
import { JsonLd } from "@/lib/seo";
import { AuthorAvatar } from "./author-avatar";
import { SocialIcon } from "./social-icon";

export async function authorProfileMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const author = await getAuthorBySlug(slug).catch(() => null);
  if (!author) return {};
  const a = localizeAuthor(author, locale);
  const title = a.role ? `${a.displayName} | ${a.role}` : a.displayName;
  const description = a.bioShort ?? undefined;
  const site = siteUrl();
  return {
    title,
    description,
    alternates: {
      canonical: a.url,
      languages: {
        en: `${site}/en/authors/${author.slugEn}`,
        hr: `${site}/hr/autori/${author.slugHr}`,
        "x-default": `${site}/en/authors/${author.slugEn}`,
      },
    },
    openGraph: {
      title,
      description,
      url: a.url,
      type: "profile",
      images: a.photoUrl ? [{ url: a.photoUrl }] : undefined,
    },
  };
}

async function articlesByAuthor(authorId: string, locale: Locale, languageId: string) {
  return db.articleTranslation.findMany({
    where: {
      languageId,
      status: "PUBLISHED",
      article: { status: "PUBLISHED", deletedAt: null, authorProfileId: authorId },
    },
    orderBy: { article: { publishedAt: "desc" } },
    take: 24,
    select: { title: true, slug: true, excerpt: true, article: { select: { publishedAt: true } } },
  });
}

export async function AuthorProfilePage({ locale, slug }: { locale: Locale; slug: string }) {
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const a = localizeAuthor(author, locale);
  const t = authorLabels(locale);
  const language = await getLanguage(locale);
  const posts = language ? await articlesByAuthor(author.id, locale, language.id).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={authorPersonJsonLd(author, locale)} />

      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
        <AuthorAvatar photoUrl={a.photoUrl} alt={a.photoAlt} name={a.displayName} size={120} className="border-2 border-primary/20" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{a.displayName}</h1>
          {a.role && <p className="mt-1 text-lg text-muted">{a.role}</p>}
          {a.bioShort && <p className="mt-3 text-foreground/90">{a.bioShort}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {a.email && (
              <a href={`mailto:${a.email}`} aria-label={`Email ${a.displayName}`} className="text-muted hover:text-primary"><Mail size={18} /></a>
            )}
            {a.socials.map((s) => (
              <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={s.label} title={s.label} className="text-muted hover:text-primary">
                <SocialIcon kind={s.key} size={18} />
              </a>
            ))}
          </div>
        </div>
      </header>

      {a.expertise.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t.expertise}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.expertise.map((tag) => (
              <span key={tag} className="rounded-full bg-soft px-3 py-1 text-sm font-medium text-primary">{tag}</span>
            ))}
          </div>
        </section>
      )}

      {a.bioLong && (
        <section className="prose-varel mt-8 max-w-none">
          {a.bioLong.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{t.articlesBy} {a.displayName}</h2>
          <ul className="mt-4 divide-y divide-border rounded-card border border-border">
            {posts.map((p) => (
              <li key={p.slug} className="p-4">
                <Link href={`/${locale}/guides/${p.slug}`} className="font-semibold hover:text-primary">{p.title}</Link>
                {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>}
                {p.article.publishedAt && (
                  <p className="mt-1 text-xs text-muted">{new Date(p.article.publishedAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
