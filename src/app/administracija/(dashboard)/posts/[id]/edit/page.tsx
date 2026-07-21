import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PostEditor, type PostEditorData, type EditorOptions } from "@/components/admin/editor/post-editor";

export const dynamic = "force-dynamic";

function toStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function toFaq(v: unknown): { question: string; answer: string }[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is { question: string; answer: string } => !!x && typeof x === "object")
        .map((x) => ({ question: String(x.question ?? ""), answer: String(x.answer ?? "") }))
    : [];
}
function toSources(v: unknown): { title: string; url: string; note?: string }[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({ title: String(x.title ?? ""), url: String(x.url ?? ""), note: x.note ? String(x.note) : "" }))
    : [];
}

export default async function EditPostPage(props: PageProps<"/administracija/posts/[id]/edit">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const langCode = typeof sp.lang === "string" ? sp.lang : "hr";

  const article = await db.article.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      translations: { include: { language: true } },
    },
  });
  if (!article) notFound();

  const [languages, categories, tools, reviewers, authors] = await Promise.all([
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.category.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { position: "asc" },
      include: { translations: { select: { name: true, languageId: true } } },
    }),
    db.tool.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.author.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { internalName: "asc" }],
      select: { id: true, displayNameEn: true, displayNameHr: true, photoUrl: true, bioShortEn: true, bioShortHr: true },
    }),
  ]);

  const language = languages.find((l) => l.code === langCode) ?? languages.find((l) => l.code === "hr") ?? languages[0];
  const tr = article.translations.find((t) => t.languageId === language.id);

  const [seo, featured, media, revisions] = await Promise.all([
    db.seoMetadata.findUnique({
      where: { entityType_entityId_languageId: { entityType: "ARTICLE", entityId: id, languageId: language.id } },
    }),
    article.featuredImageId
      ? db.media.findUnique({ where: { id: article.featuredImageId }, select: { url: true } })
      : Promise.resolve(null),
    db.media.findMany({
      where: { mimeType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, url: true, filename: true },
    }),
    db.articleRevision.findMany({
      where: { articleId: id, languageId: language.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, kind: true, createdByName: true, createdAt: true },
    }),
  ]);

  const robots = seo?.robots ?? "index,follow";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const categoryName = (c: (typeof categories)[number]) =>
    c.translations.find((t) => t.languageId === language.id)?.name ??
    c.translations[0]?.name ??
    c.slug;

  const data: PostEditorData = {
    id: article.id,
    languageId: language.id,
    languageCode: language.code,
    title: tr?.title ?? "",
    slug: tr?.slug ?? "",
    excerpt: tr?.excerpt ?? "",
    body: tr?.body ?? "",
    focusKeyword: tr?.focusKeyword ?? seo?.focusKeyword ?? "",
    status: article.status,
    featuredImageId: article.featuredImageId,
    featuredImageUrl: featured?.url ?? null,
    featuredImageAlt: tr?.featuredImageAlt ?? "",
    scheduledAt: article.scheduledAt ? article.scheduledAt.toISOString().slice(0, 16) : null,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    author: article.author?.name ?? "—",
    authorProfileId: article.authorProfileId,
    primaryCategoryId: article.primaryCategoryId,
    secondaryCategoryIds: toStrings(article.secondaryCategoryIdsJson),
    seo: {
      metaTitle: seo?.metaTitle ?? "",
      metaDescription: seo?.metaDescription ?? "",
      secondaryKeywords: toStrings(seo?.secondaryKeywordsJson),
      canonicalUrl: seo?.canonicalUrl ?? "",
      ogTitle: seo?.ogTitle ?? "",
      ogDescription: seo?.ogDescription ?? "",
      ogImageId: seo?.ogImageId ?? null,
      twitterTitle: seo?.twitterTitle ?? "",
      twitterDescription: seo?.twitterDescription ?? "",
      robotsIndex: !robots.includes("noindex"),
      robotsFollow: !robots.includes("nofollow"),
    },
    llm: {
      aiSummary: tr?.aiSummary ?? "",
      directAnswer: tr?.directAnswer ?? "",
      keyTakeaways: toStrings(tr?.keyTakeawaysJson),
      bestFor: toStrings(tr?.bestForJson),
      notIdealFor: toStrings(tr?.notIdealForJson),
      mentionedEntityIds: toStrings(tr?.mentionedEntityIdsJson),
      mentionedEntitiesText: tr?.mentionedEntitiesText ?? "",
      faq: toFaq(tr?.faqJson),
      sources: toSources(tr?.sourceReferencesJson),
      reviewerId: article.reviewerId,
      lastReviewedAt: article.lastReviewedAt ? article.lastReviewedAt.toISOString().slice(0, 10) : null,
      lastTestedAt: article.lastTestedAt ? article.lastTestedAt.toISOString().slice(0, 10) : null,
      pricingCheckedAt: article.pricingCheckedAt ? article.pricingCheckedAt.toISOString().slice(0, 10) : null,
    },
    prosCons: {
      enabled: article.prosConsEnabled,
      heading: tr?.prosConsHeading ?? "",
      intro: tr?.prosConsIntro ?? "",
      pros: toStrings(tr?.prosJson),
      cons: toStrings(tr?.consJson),
    },
    comparison: {
      enabled: article.comparisonEnabled,
      toolAId: article.comparisonToolAId,
      toolBId: article.comparisonToolBId,
      heading: tr?.comparisonHeading ?? "",
      summary: tr?.comparisonSummary ?? "",
      ctaLabel: tr?.comparisonCtaLabel ?? "",
      ctaUrl: tr?.comparisonCtaUrl ?? "",
    },
    verdict: {
      enabled: article.varelVerdictEnabled,
      headline: tr?.varelVerdictHeadline ?? "",
      summary: tr?.varelVerdictSummary ?? "",
      bestFor: tr?.varelVerdictBestFor ?? "",
      skipIf: tr?.varelVerdictSkipIf ?? "",
      rating: tr?.varelVerdictRating ?? null,
    },
  };

  const options: EditorOptions = {
    categories: categories.map((c) => ({ id: c.id, name: categoryName(c) })),
    tools: tools.map((t) => ({ id: t.id, name: t.name })),
    reviewers: reviewers.map((u) => ({ id: u.id, name: u.name })),
    authors: authors.map((x) => ({
      id: x.id,
      nameEn: x.displayNameEn,
      nameHr: x.displayNameHr,
      hasPhoto: Boolean(x.photoUrl),
      hasBio: Boolean(x.bioShortEn || x.bioShortHr),
    })),
    media: media.map((m) => ({ id: m.id, url: m.url, name: m.filename })),
    siteUrl,
    revisions: revisions.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      kind: r.kind,
      createdByName: r.createdByName,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  return <PostEditor data={data} options={options} />;
}
