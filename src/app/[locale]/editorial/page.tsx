import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";

export async function generateMetadata(
  props: PageProps<"/[locale]/editorial">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return {
    title: `The Varel Brief — ${t.nav_editorial}`,
    description: "Human-written analysis of the technology and AI tool market by Matija Pinko.",
  };
}

export default async function EditorialPage(props: PageProps<"/[locale]/editorial">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const language = await getLanguage(locale);
  const posts = language
    ? await db.editorialTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          editorialPost: { status: "PUBLISHED", deletedAt: null },
        },
        include: { editorialPost: { include: { author: true } } },
        orderBy: { updatedAt: "desc" },
        take: 30,
      })
    : [];
  const author = posts[0]?.editorialPost.author;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-card border border-border bg-gradient-to-r from-soft to-background-secondary p-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          The Varel Brief
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {author ? `${t.written_by} ${author.name}` : "The Varel Brief"}
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          {author?.bio ?? t.human_written}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-3 py-1 text-xs font-semibold text-primary">
          ✍️ {t.human_written}
        </span>
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/editorial/${post.slug}`}
              className="group block rounded-card border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-2 text-xs text-muted">
                {post.category && (
                  <span className="font-semibold uppercase tracking-wide text-primary">
                    {post.category}
                  </span>
                )}
                {post.editorialPost.publishedAt && (
                  <span>· {post.editorialPost.publishedAt.toLocaleDateString(locale)}</span>
                )}
              </div>
              <h2 className="mt-2 text-xl font-bold group-hover:text-primary">{post.title}</h2>
              {post.excerpt && <p className="mt-2 text-muted">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
