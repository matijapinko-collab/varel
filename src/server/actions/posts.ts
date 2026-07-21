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
import {
  blockingIssues,
  seoChecks,
  llmChecks,
  score,
  type PostSnapshot,
  type SourceRef,
} from "@/lib/post-validation";
import type { ContentStatus } from "@/generated/prisma/client";

const LIST = "/administracija/posts";

export type PostSaveInput = {
  action: "draft" | "publish" | "update";
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  focusKeyword: string;
  scheduledAt: string | null;
  featuredImageId: string | null;
  featuredImageAlt: string;
  // Category
  primaryCategoryId: string | null;
  secondaryCategoryIds: string[];
  // Public localized author (byline)
  authorProfileId: string | null;
  // SEO
  seo: {
    metaTitle: string;
    metaDescription: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImageId: string | null;
    twitterTitle: string;
    twitterDescription: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
  // LLM / AI search
  llm: {
    aiSummary: string;
    directAnswer: string;
    keyTakeaways: string[];
    bestFor: string[];
    notIdealFor: string[];
    mentionedEntityIds: string[];
    mentionedEntitiesText: string;
    faq: { question: string; answer: string }[];
    sources: SourceRef[];
    reviewerId: string | null;
    lastReviewedAt: string | null;
    lastTestedAt: string | null;
    pricingCheckedAt: string | null;
  };
  // Pros / Cons
  prosCons: { enabled: boolean; heading: string; intro: string; pros: string[]; cons: string[] };
  // Comparison
  comparison: {
    enabled: boolean;
    toolAId: string | null;
    toolBId: string | null;
    heading: string;
    summary: string;
    ctaLabel: string;
    ctaUrl: string;
  };
  // Varel Verdict
  verdict: {
    enabled: boolean;
    headline: string;
    summary: string;
    bestFor: string;
    skipIf: string;
    rating: number | null;
  };
};

function snapshotOf(input: PostSaveInput): PostSnapshot {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    featuredImageId: input.featuredImageId,
    featuredImageAlt: input.featuredImageAlt,
    primaryCategoryId: input.primaryCategoryId,
    seoTitle: input.seo.metaTitle,
    seoDescription: input.seo.metaDescription,
    focusKeyword: input.focusKeyword,
    canonicalUrl: input.seo.canonicalUrl,
    robotsIndex: input.seo.robotsIndex,
    aiSummary: input.llm.aiSummary,
    directAnswer: input.llm.directAnswer,
    keyTakeaways: input.llm.keyTakeaways,
    bestFor: input.llm.bestFor,
    notIdealFor: input.llm.notIdealFor,
    mentionedEntityIds: input.llm.mentionedEntityIds,
    mentionedEntitiesText: input.llm.mentionedEntitiesText,
    faq: input.llm.faq,
    lastReviewedAt: input.llm.lastReviewedAt,
    reviewerId: input.llm.reviewerId,
    prosConsEnabled: input.prosCons.enabled,
    pros: input.prosCons.pros,
    cons: input.prosCons.cons,
    comparisonEnabled: input.comparison.enabled,
    comparisonToolAId: input.comparison.toolAId,
    comparisonToolBId: input.comparison.toolBId,
  };
}

const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

/** Full save from the classic editor. Handles Save Draft / Publish / Update. */
/** How many revisions to keep per article translation. */
const REVISION_LIMIT = 30;

/** Fields captured in a revision snapshot (everything an editor can change). */
const REVISION_FIELDS = [
  "title", "slug", "excerpt", "body", "focusKeyword", "secondaryKeywordsJson", "status",
  "featuredImageAlt", "prosConsHeading", "prosConsIntro", "prosJson", "consJson",
  "comparisonHeading", "comparisonSummary", "comparisonCtaLabel", "comparisonCtaUrl",
  "aiSummary", "directAnswer", "keyTakeawaysJson", "bestForJson", "notIdealForJson",
  "mentionedEntityIdsJson", "mentionedEntitiesText", "sourceReferencesJson", "faqJson",
  "varelVerdictHeadline", "varelVerdictSummary", "varelVerdictBestFor", "varelVerdictSkipIf",
  "varelVerdictRating",
] as const;

/**
 * Stores the current translation as a revision, then prunes old ones.
 * No-op when the translation does not exist yet (first save has nothing to keep).
 */
async function recordRevision(articleId: string, languageId: string, kind: string, userId: string) {
  const current = await db.articleTranslation.findUnique({
    where: { articleId_languageId: { articleId, languageId } },
  });
  if (!current) return;

  const snapshot: Record<string, unknown> = {};
  for (const f of REVISION_FIELDS) snapshot[f] = (current as Record<string, unknown>)[f] ?? null;

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
  await db.articleRevision.create({
    data: {
      articleId, languageId,
      snapshotJson: snapshot as never,
      title: current.title,
      status: current.status,
      kind,
      createdById: userId,
      createdByName: user?.name ?? user?.username ?? null,
    },
  });

  // Keep only the newest REVISION_LIMIT entries for this translation.
  const old = await db.articleRevision.findMany({
    where: { articleId, languageId },
    orderBy: { createdAt: "desc" },
    skip: REVISION_LIMIT,
    select: { id: true },
  });
  if (old.length) {
    await db.articleRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
}

/** Revisions for the editor panel, newest first. */
export async function listRevisions(articleId: string, languageId: string) {
  await requirePermission("content.edit");
  return db.articleRevision.findMany({
    where: { articleId, languageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, kind: true, createdByName: true, createdAt: true },
  });
}

/**
 * Rolls the translation back to a revision. The current state is snapshotted
 * first (kind "restore"), so a restore is itself undoable.
 */
export async function restoreRevision(revisionId: string): Promise<{ ok: boolean; message: string }> {
  const { userId } = await requirePermission("content.edit");
  const rev = await db.articleRevision.findUnique({ where: { id: revisionId } });
  if (!rev) return { ok: false, message: "Revision not found." };

  await recordRevision(rev.articleId, rev.languageId, "restore", userId);

  const snap = (rev.snapshotJson ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const f of REVISION_FIELDS) if (f in snap) data[f] = snap[f];

  await db.articleTranslation.update({
    where: { articleId_languageId: { articleId: rev.articleId, languageId: rev.languageId } },
    data: data as never,
  });
  // Keep the article-level status in step with the restored translation.
  if (typeof snap.status === "string") {
    await db.article.update({ where: { id: rev.articleId }, data: { status: snap.status as ContentStatus } });
  }

  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: rev.articleId, details: { restoredRevisionId: revisionId } });
  revalidatePath(LIST);
  revalidatePath("/", "layout");
  return { ok: true, message: "Revision restored." };
}

export async function savePost(
  id: string,
  languageId: string,
  input: PostSaveInput
): Promise<{ ok: boolean; blocked?: boolean; issues?: string[]; status?: ContentStatus; message: string }> {
  const { userId } = await requirePermission("content.edit");

  const snap = snapshotOf(input);
  const publishing = input.action === "publish" || input.action === "update";

  // Enforce publish validation server-side (defense in depth).
  if (publishing) {
    const issues = blockingIssues(snap);
    if (issues.length > 0) {
      return { ok: false, blocked: true, issues: issues.map((i) => i.label), message: "Complete required fields before publishing." };
    }
  }

  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const willSchedule = scheduled != null && scheduled.getTime() > Date.now();

  let status: ContentStatus;
  let message: string;
  if (input.action === "publish") {
    await requirePermission("content.publish");
    status = willSchedule ? "SCHEDULED" : "PUBLISHED";
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
  const seoCompletionScore = score([...seoChecks(snap)]);
  const llmCompletionScore = score([...llmChecks(snap)]);

  await db.article.update({
    where: { id },
    data: {
      status,
      featuredImageId: input.featuredImageId,
      scheduledAt: scheduled,
      publishedAt: status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
      primaryCategoryId: input.primaryCategoryId,
      secondaryCategoryIdsJson: input.secondaryCategoryIds,
      prosConsEnabled: input.prosCons.enabled,
      comparisonEnabled: input.comparison.enabled,
      comparisonToolAId: input.comparison.enabled ? input.comparison.toolAId : null,
      comparisonToolBId: input.comparison.enabled ? input.comparison.toolBId : null,
      varelVerdictEnabled: input.verdict.enabled,
      authorProfileId: input.authorProfileId,
      reviewerId: input.llm.reviewerId,
      lastReviewedAt: input.llm.lastReviewedAt ? new Date(input.llm.lastReviewedAt) : null,
      lastTestedAt: input.llm.lastTestedAt ? new Date(input.llm.lastTestedAt) : null,
      pricingCheckedAt: input.llm.pricingCheckedAt ? new Date(input.llm.pricingCheckedAt) : null,
    },
  });

  const title = input.title.trim() || "Untitled post";
  const trData = {
    title,
    slug: slugify(input.slug || title),
    excerpt: input.excerpt || null,
    body: input.body ? sanitizePostHtml(input.body) : null,
    focusKeyword: input.focusKeyword || null,
    secondaryKeywordsJson: clean(input.seo.secondaryKeywords),
    status,
    featuredImageAlt: input.featuredImageAlt || null,
    prosConsHeading: input.prosCons.heading || null,
    prosConsIntro: input.prosCons.intro || null,
    prosJson: clean(input.prosCons.pros),
    consJson: clean(input.prosCons.cons),
    comparisonHeading: input.comparison.heading || null,
    comparisonSummary: input.comparison.summary || null,
    comparisonCtaLabel: input.comparison.ctaLabel || null,
    comparisonCtaUrl: input.comparison.ctaUrl || null,
    aiSummary: input.llm.aiSummary || null,
    directAnswer: input.llm.directAnswer || null,
    keyTakeawaysJson: clean(input.llm.keyTakeaways),
    bestForJson: clean(input.llm.bestFor),
    notIdealForJson: clean(input.llm.notIdealFor),
    mentionedEntityIdsJson: input.llm.mentionedEntityIds,
    mentionedEntitiesText: input.llm.mentionedEntitiesText || null,
    sourceReferencesJson: input.llm.sources.filter((s) => s.title.trim() || s.url.trim()),
    faqJson: input.llm.faq.filter((f) => f.question.trim() && f.answer.trim()),
    varelVerdictHeadline: input.verdict.headline || null,
    varelVerdictSummary: input.verdict.summary || null,
    varelVerdictBestFor: input.verdict.bestFor || null,
    varelVerdictSkipIf: input.verdict.skipIf || null,
    varelVerdictRating: input.verdict.rating,
    seoCompletionScore,
    llmCompletionScore,
  };
  // Snapshot the PREVIOUS state before overwriting, so the editor can roll back.
  await recordRevision(id, languageId, input.action === "publish" || input.action === "update" ? "publish" : "save", userId);

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
    secondaryKeywordsJson: clean(input.seo.secondaryKeywords),
    canonicalUrl: input.seo.canonicalUrl || null,
    ogTitle: input.seo.ogTitle || null,
    ogDescription: input.seo.ogDescription || null,
    ogImageId: input.seo.ogImageId,
    twitterTitle: input.seo.twitterTitle || null,
    twitterDescription: input.seo.twitterDescription || null,
    focusKeyword: input.focusKeyword || null,
    robots,
  };
  await db.seoMetadata.upsert({
    where: { entityType_entityId_languageId: { entityType: "ARTICLE", entityId: id, languageId } },
    create: { entityType: "ARTICLE", entityId: id, languageId, ...seoData },
    update: seoData,
  });

  await audit({
    userId,
    action: input.action === "publish" ? "PUBLISH" : "UPDATE",
    entityType: "ARTICLE",
    entityId: id,
    details: { editor: "classic", action: input.action, seoCompletionScore, llmCompletionScore },
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
