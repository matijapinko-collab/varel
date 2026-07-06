"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission } from "./helpers";

/**
 * Creates a DRAFT translation by copying the Croatian original into the
 * target language. The copy is marked "[TRANSLATE]" so the translator (or a
 * future AI translation integration) knows it still contains source text.
 * Translations are NEVER auto-published (editorial workflow requirement).
 */
export async function createDraftTranslation(
  entityKind: string,
  entityId: string,
  targetLanguageId: string
) {
  const { userId } = await requirePermission("translations.manage");

  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (!hr) throw new Error("Croatian source language missing");
  const mark = (s: string | null | undefined) => (s ? `[TRANSLATE] ${s}` : s ?? null);

  switch (entityKind) {
    case "tool": {
      const src = await db.toolTranslation.findUnique({
        where: { toolId_languageId: { toolId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.toolTranslation.upsert({
        where: { toolId_languageId: { toolId: entityId, languageId: targetLanguageId } },
        create: {
          toolId: entityId,
          languageId: targetLanguageId,
          name: src.name,
          slug: src.slug,
          shortDescription: mark(src.shortDescription),
          longDescription: src.longDescription,
          bestFor: src.bestFor,
          whoShouldUseIt: src.whoShouldUseIt,
          whoShouldAvoidIt: src.whoShouldAvoidIt,
          prosJson: src.prosJson ?? undefined,
          consJson: src.consJson ?? undefined,
          faqJson: src.faqJson ?? undefined,
          useCasesJson: src.useCasesJson ?? undefined,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "article": {
      const src = await db.articleTranslation.findUnique({
        where: { articleId_languageId: { articleId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.articleTranslation.upsert({
        where: { articleId_languageId: { articleId: entityId, languageId: targetLanguageId } },
        create: {
          articleId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          excerpt: src.excerpt,
          body: src.body,
          faqJson: src.faqJson ?? undefined,
          focusKeyword: src.focusKeyword,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "editorial": {
      const src = await db.editorialTranslation.findUnique({
        where: {
          editorialPostId_languageId: { editorialPostId: entityId, languageId: hr.id },
        },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.editorialTranslation.upsert({
        where: {
          editorialPostId_languageId: {
            editorialPostId: entityId,
            languageId: targetLanguageId,
          },
        },
        create: {
          editorialPostId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          excerpt: src.excerpt,
          body: src.body,
          predictionText: src.predictionText,
          marketImpact: src.marketImpact,
          category: src.category,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "news": {
      const src = await db.newsTranslation.findUnique({
        where: { newsItemId_languageId: { newsItemId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.newsTranslation.upsert({
        where: { newsItemId_languageId: { newsItemId: entityId, languageId: targetLanguageId } },
        create: {
          newsItemId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          summary: src.summary,
          body: src.body,
          whyItMatters: src.whyItMatters,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "comparison": {
      const src = await db.comparisonTranslation.findUnique({
        where: { comparisonId_languageId: { comparisonId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.comparisonTranslation.upsert({
        where: {
          comparisonId_languageId: { comparisonId: entityId, languageId: targetLanguageId },
        },
        create: {
          comparisonId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          summary: src.summary,
          verdict: src.verdict,
          body: src.body,
          faqJson: src.faqJson ?? undefined,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "prompt": {
      const src = await db.promptTranslation.findUnique({
        where: { promptId_languageId: { promptId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.promptTranslation.upsert({
        where: { promptId_languageId: { promptId: entityId, languageId: targetLanguageId } },
        create: {
          promptId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          description: src.description,
          promptText: src.promptText,
          variablesJson: src.variablesJson ?? undefined,
          exampleOutput: src.exampleOutput,
          compatibleModelsJson: src.compatibleModelsJson ?? undefined,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    case "deal": {
      const src = await db.dealTranslation.findUnique({
        where: { dealId_languageId: { dealId: entityId, languageId: hr.id } },
      });
      if (!src) throw new Error("Croatian original not found");
      await db.dealTranslation.upsert({
        where: { dealId_languageId: { dealId: entityId, languageId: targetLanguageId } },
        create: {
          dealId: entityId,
          languageId: targetLanguageId,
          title: mark(src.title)!,
          slug: src.slug,
          description: src.description,
          ctaText: src.ctaText,
          status: "DRAFT",
        },
        update: {},
      });
      break;
    }
    default:
      throw new Error(`Unknown entity kind: ${entityKind}`);
  }

  await audit({
    userId,
    action: "TRANSLATION_GENERATED",
    entityType: entityKind.toUpperCase(),
    entityId,
    details: { targetLanguageId },
  });
  revalidatePath("/administracija/translations");
}
