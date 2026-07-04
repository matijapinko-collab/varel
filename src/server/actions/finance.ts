"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, slugify, fd, fdBool, fdNum, fdLines, fdFaq } from "./helpers";
import { saveSeoFromForm } from "./seo";
import type {
  ContentStatus,
  FinancePlatformType,
  FinanceRiskLevel,
  InvestmentIdeaType,
  TimeHorizon,
} from "@/generated/prisma/client";

/* ---------------- Finance platforms (brokers / apps / tools) ---------------- */

export async function createFinancePlatform(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const name = fd(form, "name");
  if (!name) throw new Error("Name is required");
  const platform = await db.financePlatform.create({
    data: {
      name,
      slug: slugify(fd(form, "slug") || name),
      type: (fd(form, "type") || "INVESTING_APP") as FinancePlatformType,
    },
  });
  await audit({ userId, action: "CREATE", entityType: "FINANCE_PLATFORM", entityId: platform.id });
  redirect(`/admin/finance-platforms/${platform.id}`);
}

export async function saveFinancePlatform(platformId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  await db.financePlatform.update({
    where: { id: platformId },
    data: {
      name: fd(form, "name"),
      slug: slugify(fd(form, "slug") || fd(form, "name")),
      type: (fd(form, "type") || "INVESTING_APP") as FinancePlatformType,
      logoId: fd(form, "logoId") || null,
      description: fd(form, "description") || null,
      companyName: fd(form, "companyName") || null,
      websiteUrl: fd(form, "websiteUrl") || null,
      affiliateUrl: fd(form, "affiliateUrl") || null,
      supportedCountriesJson: fdLines(form, "supportedCountries"),
      supportedAssetsJson: fdLines(form, "supportedAssets"),
      minimumDeposit: fd(form, "minimumDeposit") || null,
      feeSummary: fd(form, "feeSummary") || null,
      pricingModel: fd(form, "pricingModel") || null,
      demoAccount: fdBool(form, "demoAccount"),
      mobileApp: fdBool(form, "mobileApp"),
      desktopPlatform: fdBool(form, "desktopPlatform"),
      webPlatform: fdBool(form, "webPlatform"),
      beginnerFriendly: fdBool(form, "beginnerFriendly"),
      ratingOverall: fdNum(form, "ratingOverall"),
      ratingFees: fdNum(form, "ratingFees"),
      ratingEaseOfUse: fdNum(form, "ratingEaseOfUse"),
      ratingFeatures: fdNum(form, "ratingFeatures"),
      ratingSupport: fdNum(form, "ratingSupport"),
      ratingResearchTools: fdNum(form, "ratingResearchTools"),
      prosJson: fdLines(form, "pros"),
      consJson: fdLines(form, "cons"),
      bestFor: fd(form, "bestFor") || null,
      whoShouldAvoid: fd(form, "whoShouldAvoid") || null,
      riskDisclaimer: fd(form, "riskDisclaimer") || null,
      reviewContent: fd(form, "reviewContent") || null,
      faqJson: fdFaq(form, "faq"),
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      lastReviewedAt: fdBool(form, "markReviewed") ? new Date() : undefined,
    },
  });

  // Alternatives (multi-checkbox of other platforms)
  const altIds = form.getAll("alternativeIds").map(String);
  await db.financePlatformAlternative.deleteMany({ where: { platformId } });
  for (let i = 0; i < altIds.length; i++) {
    await db.financePlatformAlternative.create({
      data: { platformId, alternativePlatformId: altIds[i], position: i },
    });
  }

  // SEO for every enabled language (single-locale content; canonical SEO row per language)
  const defaultLang = await db.language.findFirst({ where: { isDefault: true } });
  if (defaultLang) await saveSeoFromForm(form, "FINANCE_PLATFORM", platformId, defaultLang.id);

  await audit({ userId, action: "UPDATE", entityType: "FINANCE_PLATFORM", entityId: platformId });
  revalidatePath("/", "layout");
}

export async function deleteFinancePlatform(platformId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.financePlatform.update({
    where: { id: platformId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "FINANCE_PLATFORM", entityId: platformId });
  revalidatePath("/admin/finance-platforms");
}

/* ---------------- Stock analysis ---------------- */

export async function createStockAnalysis(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const companyName = fd(form, "companyName");
  const ticker = fd(form, "ticker").toUpperCase();
  if (!companyName || !ticker) throw new Error("Company name and ticker are required");
  const analysis = await db.stockAnalysis.create({
    data: {
      companyName,
      ticker,
      slug: slugify(fd(form, "slug") || `${companyName}-${ticker}-analysis`),
      authorId: userId,
    },
  });
  await audit({ userId, action: "CREATE", entityType: "STOCK_ANALYSIS", entityId: analysis.id });
  redirect(`/admin/stock-analysis/${analysis.id}`);
}

export async function saveStockAnalysis(analysisId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;

  // Key metrics: "Label | Value" lines
  const metrics = fdLines(form, "keyMetrics").map((line) => {
    const [label, ...rest] = line.split("|");
    return { label: label.trim(), value: rest.join("|").trim() };
  });

  await db.stockAnalysis.update({
    where: { id: analysisId },
    data: {
      companyName: fd(form, "companyName"),
      ticker: fd(form, "ticker").toUpperCase(),
      slug: slugify(fd(form, "slug") || fd(form, "companyName")),
      exchange: fd(form, "exchange") || null,
      sector: fd(form, "sector") || null,
      industry: fd(form, "industry") || null,
      country: fd(form, "country") || null,
      thesisSummary: fd(form, "thesisSummary") || null,
      investmentIdeaType: (fd(form, "investmentIdeaType") || "LONG_TERM_WATCHLIST") as InvestmentIdeaType,
      riskLevel: (fd(form, "riskLevel") || "MEDIUM") as FinanceRiskLevel,
      timeHorizon: (fd(form, "timeHorizon") || "LONG_TERM") as TimeHorizon,
      valuationOverview: fd(form, "valuationOverview") || null,
      growthOverview: fd(form, "growthOverview") || null,
      profitabilityOverview: fd(form, "profitabilityOverview") || null,
      debtOverview: fd(form, "debtOverview") || null,
      dividendOverview: fd(form, "dividendOverview") || null,
      bullCaseJson: fdLines(form, "bullCase"),
      bearCaseJson: fdLines(form, "bearCase"),
      keyRisksJson: fdLines(form, "keyRisks"),
      keyMetricsJson: metrics,
      conclusion: fd(form, "conclusion") || null,
      sourcesJson: fdLines(form, "sources"),
      faqJson: fdFaq(form, "faq"),
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      lastReviewedAt: fdBool(form, "markReviewed") ? new Date() : undefined,
    },
  });

  const defaultLang = await db.language.findFirst({ where: { isDefault: true } });
  if (defaultLang) await saveSeoFromForm(form, "STOCK_ANALYSIS", analysisId, defaultLang.id);

  await audit({ userId, action: "UPDATE", entityType: "STOCK_ANALYSIS", entityId: analysisId });
  revalidatePath("/", "layout");
}

export async function deleteStockAnalysis(analysisId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.stockAnalysis.update({
    where: { id: analysisId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "STOCK_ANALYSIS", entityId: analysisId });
  revalidatePath("/admin/stock-analysis");
}
