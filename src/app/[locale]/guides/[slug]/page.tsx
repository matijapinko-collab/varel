import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { buildSeoMetadata, JsonLd, faqJsonLd, articleJsonLd } from "@/lib/seo";

async function getGuide(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.articleTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      article: { status: "PUBLISHED", deletedAt: null },
    },
    include: {
      article: {
        include: {
          author: true,
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

export async function generateMetadata(
  props: PageProps<"/[locale]/guides/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const guide = await getGuide(locale, slug);
  if (!guide) return {};
  const seo = await getSeo("ARTICLE", guide.articleId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: guide.title,
    fallbackDescription: guide.excerpt ?? undefined,
    locale,
    path: `/guides/${guide.slug}`,
  });
}

function wordsToMinutes(html: string | null): number {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function GuidePage(props: PageProps<"/[locale]/guides/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const guide = await getGuide(locale, slug);
  if (!guide) notFound();

  const faq = Array.isArray(guide.faqJson)
    ? (guide.faqJson as { question: string; answer: string }[])
    : [];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.excerpt,
          authorName: guide.article.author?.name,
          datePublished: guide.article.publishedAt,
          dateModified: guide.updatedAt,
          url: `${site}/${locale}/guides/${guide.slug}`,
        })}
      />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <div className="text-xs font-semibold uppercase tracking-wide text-primary">
        {guide.article.type === "CORNERSTONE" ? "Cornerstone guide" : "Guide"}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {guide.article.author && (
          <span>
            {t.written_by}{" "}
            <span className="font-medium text-foreground">{guide.article.author.name}</span>
          </span>
        )}
        {guide.article.publishedAt && (
          <span>· {guide.article.publishedAt.toLocaleDateString(locale)}</span>
        )}
        <span>
          · {wordsToMinutes(guide.body)} {t.reading_time}
        </span>
      </div>

      {guide.excerpt && <p className="mt-6 text-lg text-muted">{guide.excerpt}</p>}

      {guide.body && (
        <div
          className="prose-varel mt-8"
          dangerouslySetInnerHTML={{ __html: guide.body }}
        />
      )}

      {guide.article.tools.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">{t.related_guides}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {guide.article.tools.map(({ tool }) => (
              <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">{t.faq}</h2>
          <div className="mt-4">
            <FaqAccordion items={faq} />
          </div>
        </section>
      )}
    </article>
  );
}
