import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { buildSeoMetadata, JsonLd, articleJsonLd } from "@/lib/seo";
import { getDefaultAuthor, localizeAuthor, getContentSettings } from "@/lib/authors";
import { AuthorBox } from "@/components/content/author-box";

async function getPost(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.editorialTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      editorialPost: { status: "PUBLISHED", deletedAt: null },
    },
    include: { editorialPost: { include: { author: true } } },
  });
}

export async function generateMetadata(
  props: PageProps<"/[locale]/editorial/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const post = await getPost(locale, slug);
  if (!post) return {};
  const seo = await getSeo("EDITORIAL", post.editorialPostId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: post.title,
    fallbackDescription: post.excerpt ?? undefined,
    locale,
    path: `/editorial/${post.slug}`,
  });
}

function wordsToMinutes(html: string | null): number {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function EditorialPostPage(
  props: PageProps<"/[locale]/editorial/[slug]">
) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const post = await getPost(locale, slug);
  if (!post) notFound();
  const author = post.editorialPost.author;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [contentSettings, defaultAuthor] = await Promise.all([getContentSettings(), getDefaultAuthor()]);
  const la = defaultAuthor ? localizeAuthor(defaultAuthor, locale) : null;
  const displayName = la?.displayName ?? author.name;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.excerpt,
          authorName: displayName,
          authorUrl: la?.url,
          authorImage: la?.photoUrl,
          authorSameAs: la?.socials.map((s) => s.url),
          datePublished: post.editorialPost.publishedAt,
          dateModified: post.updatedAt,
          url: `${site}/${locale}/editorial/${post.slug}`,
        })}
      />

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        The Varel Brief {post.category && <span className="text-muted">· {post.category}</span>}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>

      {/* Author box — required label for the founder column */}
      <div className="mt-5 flex items-center gap-3 rounded-card border border-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft font-bold text-primary">
          {author.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {t.written_by}{" "}
            {la ? <a href={la.path} className="hover:text-primary">{displayName}</a> : displayName} —{" "}
            <span className="text-primary">{t.human_written}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
            {post.editorialPost.publishedAt && (
              <span>{post.editorialPost.publishedAt.toLocaleDateString(locale)}</span>
            )}
            <span>· {wordsToMinutes(post.body)} {t.reading_time}</span>
          </div>
        </div>
      </div>

      {post.excerpt && <p className="mt-6 text-lg text-muted">{post.excerpt}</p>}

      {post.body && (
        <div className="prose-varel mt-8" dangerouslySetInnerHTML={{ __html: post.body }} />
      )}

      {post.predictionText && (
        <div className="mt-10 rounded-card border border-primary/30 bg-soft p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Prediction
          </div>
          <p className="mt-2">{post.predictionText}</p>
        </div>
      )}
      {post.marketImpact && (
        <div className="mt-4 rounded-card border border-border bg-card p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Market impact
          </div>
          <p className="mt-2">{post.marketImpact}</p>
        </div>
      )}

      {defaultAuthor && contentSettings.authorBoxOnArticles ? (
        <AuthorBox author={defaultAuthor} locale={locale} lastUpdated={post.updatedAt} />
      ) : (
        author.bio && (
          <div className="mt-12 rounded-card border border-border bg-background-secondary p-6 text-sm text-muted">
            <span className="font-semibold text-foreground">{displayName}</span> — {author.bio}
          </div>
        )
      )}
    </article>
  );
}
