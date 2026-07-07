import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { ProsConsBox } from "@/components/blocks/pros-cons-box";
import { ComparisonBox, type ComparisonTool } from "@/components/blocks/comparison-box";
import { VerdictBox } from "@/components/blocks/verdict-box";
import { buildSeoMetadata, JsonLd, faqJsonLd, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

function toStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

async function getGuide(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  const toolInclude = {
    include: { logo: true, translations: { where: { languageId: language.id } } },
  };
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
          reviewer: true,
          featuredImage: true,
          comparisonToolA: toolInclude,
          comparisonToolB: toolInclude,
          primaryCategory: { include: { translations: { where: { languageId: language.id } } } },
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
  const a = guide.article;

  const pros = toStrings(guide.prosJson);
  const cons = toStrings(guide.consJson);
  const lastUpdated = a.lastReviewedAt ?? guide.updatedAt;

  // Public category label
  const category = a.primaryCategory;
  const categoryTr = category?.translations[0];

  // Lazy-load images embedded in the body.
  const bodyHtml = guide.body
    ? guide.body.replace(/<img (?![^>]*loading=)/gi, '<img loading="lazy" ')
    : null;

  const toolLink = (tool: { translations: { slug: string }[] } | null | undefined) =>
    tool?.translations[0]?.slug ? `/${locale}/tools/${tool.translations[0].slug}` : null;

  const cmpA: ComparisonTool | null = a.comparisonEnabled && a.comparisonToolA
    ? { name: a.comparisonToolA.name, href: toolLink(a.comparisonToolA), logoUrl: a.comparisonToolA.logo?.url ?? null }
    : null;
  const cmpB: ComparisonTool | null = a.comparisonEnabled && a.comparisonToolB
    ? { name: a.comparisonToolB.name, href: toolLink(a.comparisonToolB), logoUrl: a.comparisonToolB.logo?.url ?? null }
    : null;

  const breadcrumb = [
    { name: "Home", url: `${site}/${locale}` },
    ...(categoryTr ? [{ name: categoryTr.name, url: `${site}/${locale}/categories/${categoryTr.slug}` }] : []),
    { name: guide.title, url: `${site}/${locale}/guides/${guide.slug}` },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.excerpt,
          authorName: a.author?.name,
          datePublished: a.publishedAt,
          dateModified: lastUpdated,
          url: `${site}/${locale}/guides/${guide.slug}`,
        })}
      />
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        {categoryTr ? (
          <Link href={`/${locale}/categories/${categoryTr.slug}`} className="hover:underline">{categoryTr.name}</Link>
        ) : (
          <span>{a.type === "CORNERSTONE" ? "Cornerstone guide" : "Guide"}</span>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {a.author && (
          <span>
            {t.written_by} <span className="font-medium text-foreground">{a.author.name}</span>
          </span>
        )}
        {a.reviewer && a.reviewer.id !== a.author?.id && (
          <span>· Reviewed by <span className="font-medium text-foreground">{a.reviewer.name}</span></span>
        )}
        <span>· Updated {lastUpdated.toLocaleDateString(locale)}</span>
        <span>· {wordsToMinutes(guide.body)} {t.reading_time}</span>
      </div>

      {/* Short answer summary box (near top for readers + AI engines) */}
      {(guide.aiSummary || guide.directAnswer) && (
        <div className="mt-6 rounded-card border border-border bg-soft/40 p-5">
          {guide.aiSummary && <p className="text-base font-medium">{guide.aiSummary}</p>}
          {guide.directAnswer && <p className="mt-2 text-sm text-muted">{guide.directAnswer}</p>}
        </div>
      )}

      {a.featuredImage?.url && (
        <div className="mt-6 overflow-hidden rounded-card border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.featuredImage.url} alt={guide.featuredImageAlt ?? guide.title} loading="lazy" className="w-full object-cover" />
        </div>
      )}

      {guide.excerpt && <p className="mt-6 text-lg text-muted">{guide.excerpt}</p>}

      {bodyHtml && <div className="prose-varel mt-8" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}

      {a.prosConsEnabled && (
        <ProsConsBox heading={guide.prosConsHeading} intro={guide.prosConsIntro} pros={pros} cons={cons} />
      )}

      {cmpA && cmpB && (
        <ComparisonBox
          heading={guide.comparisonHeading}
          summary={guide.comparisonSummary}
          toolA={cmpA}
          toolB={cmpB}
          ctaLabel={guide.comparisonCtaLabel}
          ctaUrl={guide.comparisonCtaUrl}
        />
      )}

      {faq.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{t.faq}</h2>
          <div className="mt-4">
            <FaqAccordion items={faq} />
          </div>
        </section>
      )}

      {a.varelVerdictEnabled && (
        <VerdictBox
          headline={guide.varelVerdictHeadline}
          summary={guide.varelVerdictSummary}
          bestFor={guide.varelVerdictBestFor}
          skipIf={guide.varelVerdictSkipIf}
          rating={guide.varelVerdictRating}
        />
      )}

      {a.tools.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">{t.related_guides}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {a.tools.map(({ tool }) => (
              <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
