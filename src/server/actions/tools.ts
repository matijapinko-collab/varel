"use server";

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
import type { ContentStatus, PricingModel } from "@/generated/prisma/client";

export async function createTool(form: FormData) {
  const { userId } = await requirePermission("tools.manage");
  const name = fd(form, "name");
  if (!name) throw new Error("Name is required");
  const tool = await db.tool.create({
    data: {
      name,
      slug: slugify(fd(form, "slug") || name),
      status: "DRAFT",
      createdById: userId,
    },
  });
  await audit({ userId, action: "CREATE", entityType: "TOOL", entityId: tool.id });
  redirect(`/administracija/tools/${tool.id}`);
}

export async function saveTool(toolId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("tools.manage");

  const status = fd(form, "status") as ContentStatus;
  await db.tool.update({
    where: { id: toolId },
    data: {
      name: fd(form, "name"),
      slug: slugify(fd(form, "slug") || fd(form, "name")),
      websiteUrl: fd(form, "websiteUrl") || null,
      pricingModel: (fd(form, "pricingModel") || "FREEMIUM") as PricingModel,
      hasFreeTrial: fdBool(form, "hasFreeTrial"),
      hasApi: fdBool(form, "hasApi"),
      isOpenSource: fdBool(form, "isOpenSource"),
      isFeatured: fdBool(form, "isFeatured"),
      isTrending: fdBool(form, "isTrending"),
      editorRating: fdNum(form, "editorRating"),
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      updatedById: userId,
      logoId: fd(form, "logoId") || null,
    },
  });

  // Categories (multi-checkbox)
  const categoryIds = form.getAll("categoryIds").map(String);
  await db.toolCategory.deleteMany({ where: { toolId } });
  if (categoryIds.length) {
    await db.toolCategory.createMany({
      data: categoryIds.map((categoryId) => ({ toolId, categoryId })),
    });
  }

  // Translation for the language being edited
  const trName = fd(form, "tr_name");
  if (trName) {
    const data = {
      name: trName,
      slug: slugify(fd(form, "tr_slug") || trName),
      shortDescription: fd(form, "tr_shortDescription") || null,
      longDescription: fd(form, "tr_longDescription") || null,
      bestFor: fd(form, "tr_bestFor") || null,
      whoShouldUseIt: fd(form, "tr_whoShouldUseIt") || null,
      whoShouldAvoidIt: fd(form, "tr_whoShouldAvoidIt") || null,
      prosJson: fdLines(form, "tr_pros"),
      consJson: fdLines(form, "tr_cons"),
      useCasesJson: fdLines(form, "tr_useCases"),
      faqJson: fdFaq(form, "tr_faq"),
      status: (fd(form, "tr_status") || "DRAFT") as ContentStatus,
    };
    await db.toolTranslation.upsert({
      where: { toolId_languageId: { toolId, languageId } },
      create: { toolId, languageId, ...data },
      update: data,
    });
  }

  // Features: "name | description" lines
  await db.toolFeature.deleteMany({ where: { toolId } });
  const features = fdLines(form, "features");
  for (let i = 0; i < features.length; i++) {
    const [name, ...rest] = features[i].split("|");
    if (!name?.trim()) continue;
    await db.toolFeature.create({
      data: {
        toolId,
        name: name.trim(),
        description: rest.join("|").trim() || null,
        position: i,
      },
    });
  }

  // Pricing: "plan | price | period | popular" lines
  await db.toolPricing.deleteMany({ where: { toolId } });
  const plans = fdLines(form, "pricingPlans");
  for (let i = 0; i < plans.length; i++) {
    const [planName, price, billingPeriod, popular] = plans[i].split("|").map((s) => s.trim());
    if (!planName) continue;
    await db.toolPricing.create({
      data: {
        toolId,
        planName,
        price: price && !Number.isNaN(Number(price)) ? price : null,
        billingPeriod: billingPeriod || "month",
        isPopular: popular === "popular" || popular === "true",
        position: i,
      },
    });
  }

  await saveSeoFromForm(form, "TOOL", toolId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "TOOL", entityId: toolId });
  revalidatePath("/", "layout");
}

export async function deleteTool(toolId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.tool.update({
    where: { id: toolId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "TOOL", entityId: toolId });
  revalidatePath("/administracija/tools");
}
