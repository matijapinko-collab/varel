"use server";

/**
 * Server actions for the translation-based content modules:
 * guides (articles), editorial posts, news, prompts, deals, comparisons.
 * All mutations are permission-checked and audited.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import {
  requirePermission,
  slugify,
  fd,
  fdBool,
  fdNum,
  fdLines,
  fdFaq,
} from "./helpers";
import { saveSeoFromForm } from "./seo";
import type {
  ArticleType,
  ContentStatus,
  NewsPriority,
  PromptDifficulty,
} from "@/generated/prisma/client";

function statusDates(status: ContentStatus) {
  return status === "PUBLISHED" ? { publishedAt: new Date() } : {};
}

/* ---------------- Guides (articles) ---------------- */

export async function createArticle(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const article = await db.article.create({
    data: {
      type: (fd(form, "type") || "STANDARD") as ArticleType,
      authorId: userId,
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "ARTICLE", entityId: article.id });
  redirect(`/administracija/guides/${article.id}?lang=hr`);
}

/** Dashboard "Quick Draft" widget → creates a draft post (Article). */
export async function createQuickDraft(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const article = await db.article.create({
    data: {
      type: "STANDARD",
      status: "DRAFT",
      authorId: userId,
      translations: {
        create: {
          languageId: hr.id,
          title,
          slug: slugify(title),
          body: fd(form, "body") || null,
          status: "DRAFT",
        },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "ARTICLE", entityId: article.id, details: { via: "quick_draft" } });
  redirect(`/administracija/posts/${article.id}/edit`);
}

export async function saveArticle(articleId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.article.update({
    where: { id: articleId },
    data: {
      type: (fd(form, "type") || "STANDARD") as ArticleType,
      status,
      targetWordCount: fdNum(form, "targetWordCount"),
      featuredImageId: fd(form, "featuredImageId") || null,
      ...statusDates(status),
    },
  });

  const title = fd(form, "tr_title");
  if (title) {
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      excerpt: fd(form, "tr_excerpt") || null,
      body: fd(form, "tr_body") || null,
      focusKeyword: fd(form, "tr_focusKeyword") || null,
      secondaryKeywordsJson: fdLines(form, "tr_secondaryKeywords"),
      faqJson: fdFaq(form, "tr_faq"),
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.articleTranslation.upsert({
      where: { articleId_languageId: { articleId, languageId } },
      create: { articleId, languageId, ...data },
      update: data,
    });
  }

  // Related tools (multi-checkbox)
  const toolIds = form.getAll("toolIds").map(String);
  await db.articleTool.deleteMany({ where: { articleId } });
  if (toolIds.length) {
    await db.articleTool.createMany({
      data: toolIds.map((toolId, i) => ({ articleId, toolId, position: i })),
    });
  }

  await saveSeoFromForm(form, "ARTICLE", articleId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "ARTICLE", entityId: articleId });
  revalidatePath("/", "layout");
}

export async function deleteArticle(articleId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.article.update({
    where: { id: articleId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "ARTICLE", entityId: articleId });
  revalidatePath("/administracija/guides");
}

/* ---------------- Editorial (The Varel Brief) ---------------- */

export async function createEditorial(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const post = await db.editorialPost.create({
    data: {
      authorId: userId,
      contentOrigin: "HUMAN_WRITTEN",
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "EDITORIAL", entityId: post.id });
  redirect(`/administracija/editorial/${post.id}?lang=hr`);
}

export async function saveEditorial(postId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.editorialPost.update({
    where: { id: postId },
    data: { status, featuredImageId: fd(form, "featuredImageId") || null, ...statusDates(status) },
  });

  const title = fd(form, "tr_title");
  if (title) {
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      excerpt: fd(form, "tr_excerpt") || null,
      body: fd(form, "tr_body") || null,
      predictionText: fd(form, "tr_predictionText") || null,
      marketImpact: fd(form, "tr_marketImpact") || null,
      category: fd(form, "tr_category") || null,
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.editorialTranslation.upsert({
      where: { editorialPostId_languageId: { editorialPostId: postId, languageId } },
      create: { editorialPostId: postId, languageId, ...data },
      update: data,
    });
  }

  await saveSeoFromForm(form, "EDITORIAL", postId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "EDITORIAL", entityId: postId });
  revalidatePath("/", "layout");
}

export async function deleteEditorial(postId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.editorialPost.update({
    where: { id: postId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "EDITORIAL", entityId: postId });
  revalidatePath("/administracija/editorial");
}

/* ---------------- News ---------------- */

export async function createNews(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const news = await db.newsItem.create({
    data: {
      createdById: userId,
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "NEWS", entityId: news.id });
  redirect(`/administracija/news/${news.id}?lang=hr`);
}

export async function saveNews(newsId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.newsItem.update({
    where: { id: newsId },
    data: {
      sourceName: fd(form, "sourceName") || null,
      sourceUrl: fd(form, "sourceUrl") || null,
      priority: (fd(form, "priority") || "MEDIUM") as NewsPriority,
      status,
      ...statusDates(status),
    },
  });

  const title = fd(form, "tr_title");
  if (title) {
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      summary: fd(form, "tr_summary") || null,
      body: fd(form, "tr_body") || null,
      whyItMatters: fd(form, "tr_whyItMatters") || null,
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.newsTranslation.upsert({
      where: { newsItemId_languageId: { newsItemId: newsId, languageId } },
      create: { newsItemId: newsId, languageId, ...data },
      update: data,
    });
  }

  const toolIds = form.getAll("toolIds").map(String);
  await db.newsRelatedTool.deleteMany({ where: { newsItemId: newsId } });
  if (toolIds.length) {
    await db.newsRelatedTool.createMany({
      data: toolIds.map((toolId) => ({ newsItemId: newsId, toolId })),
    });
  }

  await saveSeoFromForm(form, "NEWS", newsId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "NEWS", entityId: newsId });
  revalidatePath("/", "layout");
}

export async function deleteNews(newsId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.newsItem.update({
    where: { id: newsId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "NEWS", entityId: newsId });
  revalidatePath("/administracija/news");
}

/* ---------------- Prompts ---------------- */

export async function createPrompt(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const prompt = await db.prompt.create({
    data: {
      createdById: userId,
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "PROMPT", entityId: prompt.id });
  redirect(`/administracija/prompts/${prompt.id}?lang=hr`);
}

export async function savePrompt(promptId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");

  await db.prompt.update({
    where: { id: promptId },
    data: {
      categoryId: fd(form, "categoryId") || null,
      status: (fd(form, "status") || "DRAFT") as ContentStatus,
      difficulty: (fd(form, "difficulty") || "BEGINNER") as PromptDifficulty,
      isPremium: fdBool(form, "isPremium"),
    },
  });

  const title = fd(form, "tr_title");
  if (title) {
    // Variables: "name | example" lines
    const variables = fdLines(form, "tr_variables").map((line) => {
      const [name, ...rest] = line.split("|");
      return { name: name.trim(), example: rest.join("|").trim() || undefined };
    });
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      description: fd(form, "tr_description") || null,
      promptText: fd(form, "tr_promptText") || null,
      variablesJson: variables,
      exampleOutput: fd(form, "tr_exampleOutput") || null,
      compatibleModelsJson: fdLines(form, "tr_compatibleModels"),
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.promptTranslation.upsert({
      where: { promptId_languageId: { promptId, languageId } },
      create: { promptId, languageId, ...data },
      update: data,
    });
  }

  await saveSeoFromForm(form, "PROMPT", promptId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "PROMPT", entityId: promptId });
  revalidatePath("/", "layout");
}

export async function deletePrompt(promptId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.prompt.update({
    where: { id: promptId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "PROMPT", entityId: promptId });
  revalidatePath("/administracija/prompts");
}

/* ---------------- Deals ---------------- */

export async function createDeal(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  const brandName = fd(form, "brandName");
  if (!title || !brandName) throw new Error("Title and brand are required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const deal = await db.deal.create({
    data: {
      brandName,
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "DEAL", entityId: deal.id });
  redirect(`/administracija/deals/${deal.id}?lang=hr`);
}

export async function saveDeal(dealId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const validUntil = fd(form, "validUntil");
  const startsAt = fd(form, "startsAt");
  const endsAt = fd(form, "endsAt");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.deal.update({
    where: { id: dealId },
    data: {
      brandName: fd(form, "brandName"),
      affiliateLinkId: fd(form, "affiliateLinkId") || null,
      imageId: fd(form, "imageId") || null,
      productId: fd(form, "productId") || null,
      offerId: fd(form, "offerId") || null,
      partnerId: fd(form, "partnerId") || null,
      oldPrice: fdNum(form, "oldPrice"),
      newPrice: fdNum(form, "newPrice"),
      currency: fd(form, "currency") || "EUR",
      discountPercent: fdNum(form, "discountPercent"),
      isFeatured: fdBool(form, "isFeatured"),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : validUntil ? new Date(validUntil) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
    },
  });

  const title = fd(form, "tr_title");
  if (title) {
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      description: fd(form, "tr_description") || null,
      ctaText: fd(form, "tr_ctaText") || null,
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.dealTranslation.upsert({
      where: { dealId_languageId: { dealId, languageId } },
      create: { dealId, languageId, ...data },
      update: data,
    });
  }

  await saveSeoFromForm(form, "DEAL", dealId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "DEAL", entityId: dealId });
  revalidatePath("/", "layout");
}

export async function deleteDeal(dealId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.deal.update({
    where: { id: dealId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "DEAL", entityId: dealId });
  revalidatePath("/administracija/deals");
}

/* ---------------- Comparisons ---------------- */

export async function createComparison(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  if (!title) throw new Error("Title is required");
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian language missing");

  const cmp = await db.comparison.create({
    data: {
      createdById: userId,
      translations: {
        create: { languageId: hr.id, title, slug: slugify(title) },
      },
    },
  });
  await audit({ userId, action: "CREATE", entityType: "COMPARISON", entityId: cmp.id });
  redirect(`/administracija/comparisons/${cmp.id}?lang=hr`);
}

export async function saveComparison(comparisonId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.comparison.update({
    where: { id: comparisonId },
    data: { status, ...statusDates(status) },
  });

  // Tools in the comparison (ordered multi-checkbox)
  const toolIds = form.getAll("toolIds").map(String);
  await db.comparisonTool.deleteMany({ where: { comparisonId } });
  if (toolIds.length) {
    await db.comparisonTool.createMany({
      data: toolIds.map((toolId, i) => ({ comparisonId, toolId, position: i + 1 })),
    });
  }

  // Table rows: "Label | value for tool 1 | value for tool 2 …"
  await db.comparisonRow.deleteMany({ where: { comparisonId } });
  const rows = fdLines(form, "rows");
  for (let i = 0; i < rows.length; i++) {
    const parts = rows[i].split("|").map((s) => s.trim());
    const label = parts.shift();
    if (!label) continue;
    const values: Record<string, string> = {};
    toolIds.forEach((toolId, idx) => {
      if (parts[idx]) values[toolId] = parts[idx];
    });
    await db.comparisonRow.create({
      data: { comparisonId, label, toolValuesJson: values, position: i },
    });
  }

  const title = fd(form, "tr_title");
  if (title) {
    const data = {
      title,
      slug: slugify(fd(form, "tr_slug") || title),
      summary: fd(form, "tr_summary") || null,
      verdict: fd(form, "tr_verdict") || null,
      body: fd(form, "tr_body") || null,
      faqJson: fdFaq(form, "tr_faq"),
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.comparisonTranslation.upsert({
      where: { comparisonId_languageId: { comparisonId, languageId } },
      create: { comparisonId, languageId, ...data },
      update: data,
    });
  }

  await saveSeoFromForm(form, "COMPARISON", comparisonId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "COMPARISON", entityId: comparisonId });
  revalidatePath("/", "layout");
}

export async function deleteComparison(comparisonId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.comparison.update({
    where: { id: comparisonId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "COMPARISON", entityId: comparisonId });
  revalidatePath("/administracija/comparisons");
}
