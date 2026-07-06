import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Maps a public URL to its admin editor, for the "Edit this" button in the
 * public admin bar. Admin-only. Returns {} when the path is not editable CMS
 * content (the bar then shows only a Dashboard link).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({});

  const path = new URL(request.url).searchParams.get("path") ?? "";
  const segments = path.split("/").filter(Boolean); // [locale, section?, slug?]
  if (segments.length < 2) return NextResponse.json({});

  const [locale, a, b] = segments;
  const language = await db.language.findUnique({ where: { code: locale } });
  if (!language) return NextResponse.json({});
  const languageId = language.id;

  // /{locale}/{section}/{slug}
  if (segments.length >= 3) {
    const section = a;
    const slug = b;
    switch (section) {
      case "guides": {
        const t = await db.articleTranslation.findFirst({ where: { slug, languageId }, select: { articleId: true } });
        return json(t && { label: "Edit Post", url: `/administracija/posts/${t.articleId}/edit` });
      }
      case "tools": {
        const t = await db.toolTranslation.findFirst({ where: { slug, languageId }, select: { toolId: true } });
        return json(t && { label: "Edit Tool", url: `/administracija/tools/${t.toolId}` });
      }
      case "compare": {
        const t = await db.comparisonTranslation.findFirst({ where: { slug, languageId }, select: { comparisonId: true } });
        return json(t && { label: "Edit Comparison", url: `/administracija/comparisons/${t.comparisonId}` });
      }
      case "editorial": {
        const t = await db.editorialTranslation.findFirst({ where: { slug, languageId }, select: { editorialPostId: true } });
        return json(t && { label: "Edit Editorial", url: `/administracija/editorial/${t.editorialPostId}` });
      }
      case "news": {
        const t = await db.newsTranslation.findFirst({ where: { slug, languageId }, select: { newsItemId: true } });
        return json(t && { label: "Edit News", url: `/administracija/news/${t.newsItemId}` });
      }
      case "prompts": {
        const t = await db.promptTranslation.findFirst({ where: { slug, languageId }, select: { promptId: true } });
        return json(t && { label: "Edit Prompt", url: `/administracija/prompts/${t.promptId}` });
      }
      default:
        return NextResponse.json({});
    }
  }

  // /{locale}/{slug} → a CMS page
  const page = await db.page.findFirst({ where: { slug: a, languageId, deletedAt: null }, select: { id: true } });
  return json(page && { label: "Edit Page", url: `/administracija/pages/${page.id}` });
}

function json(v: { label: string; url: string } | null | undefined | false) {
  return NextResponse.json(v || {});
}
