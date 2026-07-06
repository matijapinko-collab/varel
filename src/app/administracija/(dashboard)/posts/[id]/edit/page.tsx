import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PostEditor, type PostEditorData } from "@/components/admin/editor/post-editor";

export const dynamic = "force-dynamic";

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

  const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
  const language = languages.find((l) => l.code === langCode) ?? languages.find((l) => l.code === "hr") ?? languages[0];
  const tr = article.translations.find((t) => t.languageId === language.id);

  const [seo, featured, media] = await Promise.all([
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
  ]);

  const robots = seo?.robots ?? "index,follow";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

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
    scheduledAt: article.scheduledAt ? article.scheduledAt.toISOString().slice(0, 16) : null,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    author: article.author?.name ?? "—",
    seo: {
      metaTitle: seo?.metaTitle ?? "",
      metaDescription: seo?.metaDescription ?? "",
      canonicalUrl: seo?.canonicalUrl ?? "",
      ogTitle: seo?.ogTitle ?? "",
      ogDescription: seo?.ogDescription ?? "",
      robotsIndex: !robots.includes("noindex"),
      robotsFollow: !robots.includes("nofollow"),
    },
  };

  return (
    <PostEditor
      data={data}
      media={media.map((m) => ({ id: m.id, url: m.url, name: m.filename }))}
      siteUrl={siteUrl}
    />
  );
}
