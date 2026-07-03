import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getPublishedTools, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { TrackView } from "@/components/analytics/track-view";
import { buildSeoMetadata } from "@/lib/seo";

async function getCategory(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.category.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ translations: { some: { languageId: language.id, slug } } }, { slug }],
    },
    include: { translations: { where: { languageId: language.id } } },
  });
}

export async function generateMetadata(
  props: PageProps<"/[locale]/categories/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const category = await getCategory(locale, slug);
  if (!category) return {};
  const tr = category.translations[0];
  const seo = await getSeo("CATEGORY", category.id, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: tr?.name ?? category.slug,
    fallbackDescription: tr?.description ?? undefined,
    locale,
    path: `/categories/${tr?.slug ?? category.slug}`,
  });
}

export default async function CategoryPage(
  props: PageProps<"/[locale]/categories/[slug]">
) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const category = await getCategory(locale, slug);
  if (!category) notFound();
  const tr = category.translations[0];
  const tools = await getPublishedTools(locale, {
    categorySlug: category.slug,
    take: 60,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <TrackView
        type="CATEGORY_CLICK"
        entityType="CATEGORY"
        entityId={category.id}
        locale={locale}
      />
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
        {category.icon && <span aria-hidden>{category.icon}</span>}
        {tr?.name ?? category.slug}
      </h1>
      {tr?.description && <p className="mt-2 max-w-2xl text-muted">{tr.description}</p>}
      {tools.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
