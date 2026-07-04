import { cache } from "react";
import { db } from "@/lib/db";
import type { FinancePlatformType } from "@/generated/prisma/client";

/** Read helpers for the Finance vertical (educational content only). */

export const FINANCE_TYPE_LABELS: Record<FinancePlatformType, string> = {
  BROKER: "Broker",
  TRADING_PLATFORM: "Trading platform",
  INVESTING_APP: "Investing app",
  PORTFOLIO_TOOL: "Portfolio tool",
  PERSONAL_FINANCE_APP: "Personal finance app",
  OTHER: "Financial tool",
};

export const RISK_LABELS: Record<string, { label: string; tone: string }> = {
  LOW: { label: "Low risk", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
  MEDIUM: { label: "Medium risk", tone: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  HIGH: { label: "High risk", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  VERY_HIGH: { label: "Very high risk", tone: "bg-red-500/10 text-red-500" },
  SPECULATIVE: { label: "Speculative", tone: "bg-red-500/10 text-red-500" },
};

export const IDEA_TYPE_LABELS: Record<string, string> = {
  LONG_TERM_WATCHLIST: "Long-term watchlist",
  GROWTH_STOCK: "Growth stock",
  DIVIDEND_STOCK: "Dividend stock",
  VALUE_STOCK: "Value stock",
  TURNAROUND_IDEA: "Turnaround idea",
  SPECULATIVE_IDEA: "Speculative idea",
  DEFENSIVE_STOCK: "Defensive stock",
  ETF_ALTERNATIVE: "ETF alternative",
  AVOID_WATCH_CAREFULLY: "Avoid / watch carefully",
};

export const HORIZON_LABELS: Record<string, string> = {
  SHORT_TERM: "Short-term",
  MEDIUM_TERM: "Medium-term",
  LONG_TERM: "Long-term",
  WATCHLIST_ONLY: "Watchlist only",
};

export const getFinancePlatforms = cache(
  async (
    opts: {
      type?: FinancePlatformType | FinancePlatformType[];
      take?: number;
      beginnerFriendly?: boolean;
      demoAccount?: boolean;
      mobileApp?: boolean;
      minRating?: number;
      query?: string;
      sort?: "rating" | "newest" | "name";
    } = {}
  ) => {
    const platforms = await db.financePlatform.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        ...(opts.type
          ? { type: Array.isArray(opts.type) ? { in: opts.type } : opts.type }
          : {}),
        ...(opts.beginnerFriendly ? { beginnerFriendly: true } : {}),
        ...(opts.demoAccount ? { demoAccount: true } : {}),
        ...(opts.mobileApp ? { mobileApp: true } : {}),
        ...(opts.minRating ? { ratingOverall: { gte: opts.minRating } } : {}),
        ...(opts.query
          ? {
              OR: [
                { name: { contains: opts.query, mode: "insensitive" } },
                { description: { contains: opts.query, mode: "insensitive" } },
                { bestFor: { contains: opts.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { logo: true, featuredImage: true },
      orderBy:
        opts.sort === "newest"
          ? { publishedAt: "desc" }
          : opts.sort === "name"
            ? { name: "asc" }
            : [{ ratingOverall: "desc" }, { name: "asc" }],
      take: opts.take ?? 60,
    });
    return platforms;
  }
);

export const getFinancePlatformBySlug = cache(async (slug: string) => {
  return db.financePlatform.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      logo: true,
      featuredImage: true,
      alternatives: {
        orderBy: { position: "asc" },
        include: { alternativePlatform: { include: { logo: true } } },
      },
    },
  });
});

export const getStockAnalyses = cache(async (take = 30) => {
  return db.stockAnalysis.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    include: { featuredImage: true, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    take,
  });
});

export const getStockAnalysisBySlug = cache(async (slug: string) => {
  return db.stockAnalysis.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { featuredImage: true, author: { select: { name: true, bio: true } } },
  });
});

export const getFinanceGuides = cache(async (languageId: string, take = 6) => {
  return db.articleTranslation.findMany({
    where: {
      languageId,
      status: "PUBLISHED",
      article: { status: "PUBLISHED", deletedAt: null, vertical: "finance" },
    },
    include: { article: true },
    orderBy: { updatedAt: "desc" },
    take,
  });
});

export function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}
