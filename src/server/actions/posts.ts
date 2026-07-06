"use server";

/**
 * WordPress-style "Posts" actions. Posts map to the Article (Guides) model.
 * Every mutation is permission-checked and audited.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, fd, slugify } from "./helpers";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { ContentStatus } from "@/generated/prisma/client";

const LIST = "/administracija/posts";

export type PostSaveInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  focusKeyword: string;
  action: "draft" | "publish" | "update";
  scheduledAt: string | null;
  featuredImageId: string | null;
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
};

/** Full save from the classic editor. Handles Save Draft / Publish / Update. */
export async function savePost(
  id: string,
  languageId: string,
  input: PostSaveInput
): Promise<{ ok: boolean; status: ContentStatus; message: string }> {
  const { userId } = await requirePermission("content.edit");

  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const willSchedule = scheduled != null && scheduled.getTime() > Date.now();

  let status: ContentStatus;
  let message: string;
  if (input.action === "publish") {
    await requirePermission("content.publish");
    status = willSchedule ? "REVIEW" : "PUBLISHED";
    message = willSchedule ? "Post scheduled." : "Post published.";
  } else if (input.action === "update") {
    await requirePermission("content.publish");
    status = "PUBLISHED";
    message = "Post updated.";
  } else {
    status = "DRAFT";
    message = "Draft saved.";
  }

  const existing = await db.article.findUnique({ where: { id }, select: { publishedAt: true } });

  await db.article.update({
    where: { id },
    data: {
      status,
      featuredImageId: input.featuredImageId,
      scheduledAt: scheduled,
      publishedAt:
        status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
    },
  });

  const title = input.title.trim() || "Untitled post";
  const trData = {
    title,
    slug: slugify(input.slug || title),
    excerpt: input.excerpt || null,
    body: input.body ? sanitizePostHtml(input.body) : null,
    focusKeyword: input.focusKeyword || null,
    status,
  };
  await db.articleTranslation.upsert({
    where: { articleId_languageId: { articleId: id, languageId } },
    create: { articleId: id, languageId, ...trData },
    update: trData,
  });

  // SEO metadata
  const robots = `${input.seo.robotsIndex ? "index" : "noindex"},${input.seo.robotsFollow ? "follow" : "nofollow"}`;
  const seoData = {
    metaTitle: input.seo.metaTitle || null,
    metaDescription: input.seo.metaDescription || null,
    canonicalUrl: input.seo.canonicalUrl || null,
    ogTitle: input.seo.ogTitle || null,
    ogDescription: input.seo.ogDescription || null,
    focusKeyword: input.focusKeyword || null,
    robots,
  };
  await db.seoMetadata.upsert({
    where: { entityType_entityId_languageId: { entityType: "ARTICLE", entityId: id, languageId } },
    create: { entityType: "ARTICLE", entityId: id, languageId, ...seoData },
    update: seoData,
  });

  const auditAction =
    input.action === "publish" ? "PUBLISH" : input.action === "update" ? "UPDATE" : "UPDATE";
  await audit({
    userId,
    action: auditAction,
    entityType: "ARTICLE",
    entityId: id,
    details: { editor: "classic", action: input.action },
  });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
  return { ok: true, status, message };
}

/**
 * Autosave. Only persists to live content for DRAFT posts (spec: never
 * overwrite published live content until the admin clicks Update). Returns a
 * skipped flag so the client can fall back to a local backup for published
 * posts.
 */
export async function autosavePost(
  id: string,
  languageId: string,
  input: { title: string; slug: string; excerpt: string; body: string }
): Promise<{ saved: boolean; at: string }> {
  const { userId } = await requirePermission("content.edit");
  const article = await db.article.findUnique({ where: { id }, select: { status: true } });
  const now = new Date().toISOString();
  if (!article || article.status !== "DRAFT") {
    return { saved: false, at: now };
  }
  const title = input.title.trim() || "Untitled post";
  const data = {
    title,
    slug: slugify(input.slug || title),
    excerpt: input.excerpt || null,
    body: input.body ? sanitizePostHtml(input.body) : null,
    status: "DRAFT" as ContentStatus,
  };
  await db.articleTranslation.upsert({
    where: { articleId_languageId: { articleId: id, languageId } },
    create: { articleId: id, languageId, ...data },
    update: data,
  });
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: id, details: { autosave: true } });
  return { saved: true, at: now };
}

export async function createPost() {
  const { userId } = await requirePermission("content.create");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");
  const article = await db.article.create({
    data: {
      type: "STANDARD",
      status: "DRAFT",
      authorId: userId,
      translations: { create: { languageId: hr.id, title: "Untitled post", slug: `post-${Date.now()}`, status: "DRAFT" } },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "ARTICLE", entityId: article.id });
  redirect(`/administracija/posts/${article.id}/edit`);
}

export async function publishPost(id: string) {
  const { userId } = await requirePermission("content.publish");
  const existing = await db.article.findUnique({ where: { id }, select: { publishedAt: true } });
  await db.article.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: existing?.publishedAt ?? new Date(),
    },
  });
  await db.articleTranslation.updateMany({
    where: { articleId: id, status: { not: "PUBLISHED" } },
    data: { status: "PUBLISHED" },
  });
  await audit({ userId, action: "PUBLISH", entityType: "ARTICLE", entityId: id });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
}

export async function setPostStatus(id: string, status: ContentStatus) {
  const { userId } = await requirePermission("content.edit");
  await db.article.update({ where: { id }, data: { status } });
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: id, details: { status } });
  revalidatePath(LIST);
}

export async function trashPost(id: string) {
  const { userId } = await requirePermission("content.delete");
  await db.article.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ userId, action: "DELETE", entityType: "ARTICLE", entityId: id, details: { trashed: true } });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
}

export async function restorePost(id: string) {
  const { userId } = await requirePermission("content.edit");
  await db.article.update({ where: { id }, data: { deletedAt: null, status: "DRAFT" } });
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: id, details: { restored: true } });
  revalidatePath(LIST);
}

export async function duplicatePost(id: string) {
  const { userId } = await requirePermission("content.create");
  const src = await db.article.findUnique({ where: { id }, include: { translations: true } });
  if (!src) throw new Error("Post not found");
  const copy = await db.article.create({
    data: {
      type: src.type,
      status: "DRAFT",
      authorId: userId,
      targetWordCount: src.targetWordCount,
      featuredImageId: src.featuredImageId,
      translations: {
        create: src.translations.map((t) => ({
          languageId: t.languageId,
          title: `${t.title} (copy)`,
          slug: `${t.slug}-copy-${Date.now().toString(36)}`,
          excerpt: t.excerpt,
          body: t.body,
          focusKeyword: t.focusKeyword,
          secondaryKeywordsJson: t.secondaryKeywordsJson ?? undefined,
          faqJson: t.faqJson ?? undefined,
          status: "DRAFT",
        })),
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "ARTICLE", entityId: copy.id, details: { duplicatedFrom: id } });
  redirect(`/administracija/posts/${copy.id}/edit`);
}

export async function quickEditPost(id: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;
  await db.article.update({
    where: { id },
    data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) },
  });
  const title = fd(form, "title");
  const languageId = fd(form, "languageId");
  if (title && languageId) {
    await db.articleTranslation.update({
      where: { articleId_languageId: { articleId: id, languageId } },
      data: { title, slug: slugify(fd(form, "slug") || title) },
    });
  }
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: id, details: { quickEdit: true } });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
}

export async function bulkPostAction(form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const ids = form.getAll("ids").map(String).filter(Boolean);
  const action = fd(form, "bulkAction");
  if (!ids.length || !action) return;

  if (action === "trash") {
    await db.article.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  } else if (action === "draft") {
    await db.article.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } });
  } else if (action === "publish") {
    await requirePermission("content.publish");
    await db.article.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await db.articleTranslation.updateMany({ where: { articleId: { in: ids } }, data: { status: "PUBLISHED" } });
  }
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", details: { bulk: action, count: ids.length } });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
}
