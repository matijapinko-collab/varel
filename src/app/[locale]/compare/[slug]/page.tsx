import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { TrackView } from "@/components/analytics/track-view";
import { buildSeoMetadata, JsonLd, faqJsonLd } from "@/lib/seo";

async function getComparison(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  const translation = await db.comparisonTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      comparison: { status: "PUBLISHED", deletedAt: null },
    },
    include: {
      comparison: {
        include: {
          tools: {
            orderBy: { position: "asc" },
            include: {
              tool: {
                include: {
                  logo: true,
                  translations: { where: { languageId: language.id } },
                  affiliateLinks: {
                    where: { status: "ACTIVE", deletedAt: null },
                    take: 1,
                  },
                },
              },
            },
          },
          rows: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  return translation;
}

export async function generateMetadata(
  props: PageProps<"/[locale]/compare/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const tr = await getComparison(locale, slug);
  if (!tr) return {};
  const seo = await getSeo("COMPARISON", tr.comparisonId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: tr.title,
    fallbackDescription: tr.summary ?? undefined,
    locale,
    path: `/compare/${tr.slug}`,
  });
}

export default async function ComparisonPage(
  props: PageProps<"/[locale]/compare/[slug]">
) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const tr = await getComparison(locale, slug);
  if (!tr) notFound();

  const tools = tr.comparison.tools;
  const rows = tr.comparison.rows;
  const faq = Array.isArray(tr.faqJson)
    ? (tr.faqJson as { question: string; answer: string }[])
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <TrackView
        type="COMPARISON_VIEW"
        entityType="COMPARISON"
        entityId={tr.comparisonId}
        locale={locale}
      />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <h1 className="text-3xl font-bold tracking-tight">{tr.title}</h1>
      {tr.summary && <p className="mt-3 max-w-3xl text-lg text-muted">{tr.summary}</p>}

      {/* Tool cards side by side */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tools.map(({ tool, winnerCategory }) => {
          const ttr = tool.translations[0];
          const affiliate = tool.affiliateLinks[0];
          const href = affiliate ? `/go/${affiliate.id}` : tool.websiteUrl ?? "#";
          return (
            <div key={tool.id} className="rounded-card border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${locale}/tools/${ttr?.slug ?? tool.slug}`}
                  className="text-xl font-bold hover:text-primary"
                >
                  {ttr?.name ?? tool.name}
                </Link>
                {winnerCategory && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    <Trophy size={12} /> {winnerCategory}
                  </span>
                )}
              </div>
              {ttr?.shortDescription && (
                <p className="mt-2 text-sm text-muted">{ttr.shortDescription}</p>
              )}
              <a
                href={href}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t.visit_website}
              </a>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      {rows.length > 0 && (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse overflow-hidden rounded-card border border-border text-sm">
            <thead>
              <tr className="bg-background-secondary">
                <th className="border-b border-border px-4 py-3 text-left font-semibold" />
                {tools.map(({ tool }) => (
                  <th
                    key={tool.id}
                    className="border-b border-border px-4 py-3 text-left font-semibold"
                  >
                    {tool.translations[0]?.name ?? tool.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = (row.toolValuesJson ?? {}) as Record<string, string>;
                return (
                  <tr key={row.id} className="odd:bg-card even:bg-background-secondary/50">
                    <td className="border-b border-border px-4 py-3 font-medium">
                      {row.label}
                    </td>
                    {tools.map(({ tool }) => (
                      <td key={tool.id} className="border-b border-border px-4 py-3 text-muted">
                        {values[tool.id] ?? values[tool.slug] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Body & verdict */}
      {tr.body && (
        <div className="prose-varel mt-10" dangerouslySetInnerHTML={{ __html: tr.body }} />
      )}
      {tr.verdict && (
        <div className="mt-10 rounded-card border border-primary/30 bg-soft p-6">
          <h2 className="text-lg font-bold">{t.verdict}</h2>
          <p className="mt-2">{tr.verdict}</p>
        </div>
      )}

      {faq.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{t.faq}</h2>
          <div className="mt-4">
            <FaqAccordion items={faq} />
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-muted">{t.affiliate_disclosure_short}</p>
    </div>
  );
}
