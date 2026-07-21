import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signPreviewToken } from "@/lib/preview-token";

export const runtime = "nodejs";

/**
 * Admin-only: mints a fresh preview token for an article and redirects to the
 * public page with it. Going through a route (instead of embedding the token
 * in the editor) means the link is never stale.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/administracija", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  }

  const { id } = await ctx.params;
  const article = await db.article.findFirst({
    where: { id, deletedAt: null },
    include: { translations: { include: { language: true } } },
  });
  if (!article) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Prefer the translation named in ?lang=, else the first one with a slug.
  const url = new URL(_request.url);
  const wanted = url.searchParams.get("lang");
  const tr =
    (wanted && article.translations.find((t) => t.language?.code === wanted && t.slug)) ||
    article.translations.find((t) => t.slug);
  if (!tr?.slug || !tr.language?.code) {
    return NextResponse.json({ error: "no_slug" }, { status: 400 });
  }

  const token = await signPreviewToken(article.id);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const target = new URL(`/${tr.language.code}/guides/${tr.slug}`, base);
  target.searchParams.set("preview", token);
  return NextResponse.redirect(target);
}
