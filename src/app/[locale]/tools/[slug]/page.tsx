import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, Check, X, ExternalLink } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { TrackView } from "@/components/analytics/track-view";
import { buildSeoMetadata, JsonLd, faqJsonLd } from "@/lib/seo";

async function getTool(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  // Match the localized slug first, then the canonical tool slug.
  const tool = await db.tool.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [
        { translations: { some: { languageId: language.id, slug } } },
        { slug },
      ],
    },
    include: {
      logo: true,
      translations: { where: { languageId: language.id } },
      categories: {
        include: {
          category: {
            include: { translations: { where: { languageId: language.id } } },
          },
        },
      },
      features: { orderBy: { position: "asc" } },
      pricingPlans: { orderBy: { position: "asc" } },
      screenshots: { include: { media: true }, orderBy: { position: "asc" } },
      alternatives: {
        include: {
          alternativeTool: {
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
        orderBy: { position: "asc" },
      },
      affiliateLinks: { where: { status: "ACTIVE", deletedAt: null }, take: 1 },
    },
  });
  return tool;
}

export async function generateMetadata(
  props: PageProps<"/[locale]/tools/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const tool = await getTool(locale, slug);
  if (!tool) return {};
  const tr = tool.translations[0];
  const seo = await getSeo("TOOL", tool.id, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: `${tr?.name ?? tool.name} — Review, Pricing & Alternatives`,
    fallbackDescription: tr?.shortDescription ?? undefined,
    locale,
    path: `/tools/${tr?.slug ?? tool.slug}`,
  });
}

export default async function ToolPage(props: PageProps<"/[locale]/tools/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const tool = await getTool(locale, slug);
  if (!tool) notFound();

  const tr = tool.translations[0];
  const name = tr?.name ?? tool.name;
  const pros = Array.isArray(tr?.prosJson) ? (tr.prosJson as string[]) : [];
  const cons = Array.isArray(tr?.consJson) ? (tr.consJson as string[]) : [];
  const faq = Array.isArray(tr?.faqJson)
    ? (tr.faqJson as { question: string; answer: string }[])
    : [];
  const useCases = Array.isArray(tr?.useCasesJson) ? (tr.useCasesJson as string[]) : [];
  const affiliate = tool.affiliateLinks[0];
  const ctaHref = affiliate ? `/go/${affiliate.id}` : tool.websiteUrl ?? "#";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <TrackView type="TOOL_VIEW" entityType="TOOL" entityId={tool.id} locale={locale} />
      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      {/* Hero */}
      <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        {tool.logo ? (
          <Image
            src={tool.logo.url}
            alt={tool.logo.altText ?? name}
            width={72}
            height={72}
            className="h-18 w-18 rounded-xl border border-border object-contain"
          />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-xl bg-soft text-2xl font-bold text-primary">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            {tool.editorRating != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-sm font-semibold text-primary">
                <Star size={13} fill="currentColor" /> {tool.editorRating.toFixed(1)}
              </span>
            )}
          </div>
          {tr?.shortDescription && (
            <p className="mt-1.5 max-w-2xl text-muted">{tr.shortDescription}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {tool.categories.map(({ category }) => (
              <Link
                key={category.id}
                href={`/${locale}/categories/${category.translations[0]?.slug ?? category.slug}`}
                className="rounded-full border border-border px-2.5 py-1 text-muted hover:border-primary hover:text-primary"
              >
                {category.translations[0]?.name ?? category.slug}
              </Link>
            ))}
            {tool.hasFreeTrial && (
              <span className="rounded-full bg-soft px-2.5 py-1 font-medium text-primary">
                {t.free_trial}
              </span>
            )}
          </div>
        </div>
        <a
          href={ctaHref}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t.visit_website} <ExternalLink size={15} />
        </a>
      </div>

      {affiliate && (
        <p className="mt-3 text-xs text-muted">{t.affiliate_disclosure_short}</p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Overview */}
          {tr?.longDescription && (
            <section>
              <div
                className="prose-varel"
                dangerouslySetInnerHTML={{ __html: tr.longDescription }}
              />
            </section>
          )}

          {/* Key features */}
          {tool.features.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{t.key_features}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {tool.features.map((f) => (
                  <li key={f.id} className="rounded-card border border-border bg-card p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Check size={15} className="text-primary" /> {f.name}
                    </div>
                    {f.description && (
                      <p className="mt-1 text-sm text-muted">{f.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Pros & cons */}
          {(pros.length > 0 || cons.length > 0) && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">
                {t.pros} & {t.cons}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-card border border-border bg-card p-5">
                  <div className="font-semibold text-green-600 dark:text-green-400">{t.pros}</div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-card border border-border bg-card p-5">
                  <div className="font-semibold text-red-500">{t.cons}</div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {cons.map((c) => (
                      <li key={c} className="flex gap-2">
                        <X size={15} className="mt-0.5 shrink-0 text-red-500" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Use cases / who should use it */}
          {useCases.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{t.best_use_cases}</h2>
              <ul className="mt-4 space-y-2">
                {useCases.map((u) => (
                  <li key={u} className="flex gap-2 text-sm">
                    <Check size={15} className="mt-0.5 shrink-0 text-primary" /> {u}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tr?.whoShouldUseIt && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{t.who_should_use}</h2>
              <p className="mt-3 text-muted">{tr.whoShouldUseIt}</p>
            </section>
          )}
          {tr?.whoShouldAvoidIt && (
            <section className="mt-6">
              <h2 className="text-xl font-bold">{t.who_should_avoid}</h2>
              <p className="mt-3 text-muted">{tr.whoShouldAvoidIt}</p>
            </section>
          )}

          {/* Screenshots */}
          {tool.screenshots.length > 0 && (
            <section className="mt-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {tool.screenshots.map((sc) => (
                  <figure key={sc.id}>
                    <Image
                      src={sc.media.url}
                      alt={sc.caption ?? sc.media.altText ?? name}
                      width={sc.media.width ?? 800}
                      height={sc.media.height ?? 500}
                      className="rounded-card border border-border"
                    />
                    {sc.caption && (
                      <figcaption className="mt-1 text-xs text-muted">{sc.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{t.faq}</h2>
              <div className="mt-4">
                <FaqAccordion items={faq} />
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {tool.pricingPlans.length > 0 && (
            <div className="rounded-card border border-border bg-card p-5">
              <h2 className="font-bold">{t.pricing}</h2>
              <div className="mt-3 space-y-3">
                {tool.pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-3 ${plan.isPopular ? "border-primary bg-soft" : "border-border"}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold">{plan.planName}</span>
                      <span className="text-sm font-bold">
                        {plan.price == null
                          ? "—"
                          : `${plan.currency === "USD" ? "$" : plan.currency + " "}${plan.price}`}
                        {plan.price != null && (
                          <span className="text-xs font-normal text-muted">/{plan.billingPeriod}</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Alternatives */}
      {tool.alternatives.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">{t.alternatives}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tool.alternatives.map((alt) => (
              <ToolCard
                key={alt.id}
                tool={alt.alternativeTool as unknown as ToolCardData}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
