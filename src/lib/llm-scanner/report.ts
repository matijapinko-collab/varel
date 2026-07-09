import "server-only";
import {
  analyzeDocument,
  analyzePage,
  assertPublicUrl,
  collectSitemapUrls,
  fetchText,
  loadRobots,
  normalizeUrl,
  domainOf,
  pickAutoDetectPages,
  type PageReport,
  type PageScores,
  type Priority,
} from "./scan";
import { ISSUE_TEXT, ISSUE_MODULE, FIX_TEMPLATES, SUMMARY_BAND, type Lang } from "./data";

export type FixTask = {
  id: string;
  priority: Priority;
  pageUrl: string;
  module: string;
  problem: string;
  whyItMatters: string;
  recommendedFix: string;
  estimatedImpact: "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard";
};

export type CompetitorComparison = {
  url: string;
  domain: string;
  scores: PageScores;
  betterAt: string[];
  worseAt: string[];
  note: string;
};

export type SocialProfileCheck = { url: string; platform: string; reachable: boolean; note: string };

export type DetailedReport = {
  version: 1;
  generatedAt: string;
  domain: string;
  reportLanguage: Lang;
  pageCount: number;
  siteScores: PageScores;
  priority: Priority;
  summaryText: string;
  pages: PageReport[];
  fixQueue: FixTask[];
  competitor?: CompetitorComparison;
  socialProfiles?: SocialProfileCheck[];
};

export type DetailedScanInput = {
  websiteUrl: string;
  additionalUrls: string[];
  pageSelectionMethod: "manual" | "auto_detect";
  competitorUrl?: string | null;
  socialUrls?: string[];
  lang: Lang;
};

const SCORE_LABEL: Record<keyof PageScores, string> = {
  overall: "overall LLM readiness",
  technicalCrawlability: "technical crawlability",
  contentExtractability: "content extractability",
  schemaReadiness: "schema readiness",
  crawlerPolicy: "AI crawler policy",
  visualConsistency: "visual consistency",
};

function detectPlatform(url: string): string {
  const h = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();
  if (h.includes("linkedin")) return "LinkedIn";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("facebook")) return "Facebook";
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
  if (h.includes("twitter") || h === "x.com" || h.endsWith(".x.com")) return "X (Twitter)";
  if (h.includes("google")) return "Google Business Profile";
  return "Profile";
}

const RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const IMPACT_RANK = { high: 0, medium: 1, low: 2 } as const;

export async function runDetailedScan(input: DetailedScanInput): Promise<DetailedReport | { error: string }> {
  const home = normalizeUrl(input.websiteUrl);
  if (!home || !(await assertPublicUrl(home))) return { error: "invalid_homepage" };

  const origin = new URL(home).origin;
  const robots = await loadRobots(origin);
  const homePage = await fetchText(home);
  if (!homePage || (!/html/i.test(homePage.contentType) && !/<html/i.test(homePage.text))) {
    return { error: "homepage_unreachable" };
  }
  const homeReport = analyzeDocument(home, homePage.text, homePage.status, robots);

  // Decide additional URLs.
  let additional: string[];
  if (input.pageSelectionMethod === "manual") {
    additional = input.additionalUrls.filter(Boolean).slice(0, 4);
  } else {
    const sitemapUrls = await collectSitemapUrls(origin, robots);
    additional = pickAutoDetectPages(home, homeReport.internalLinks, sitemapUrls, 4);
  }

  // Analyze everything else in parallel (bounded set).
  const [additionalReports, competitor, socialProfiles] = await Promise.all([
    Promise.all(additional.map((u) => analyzePage(u, robots))),
    input.competitorUrl ? analyzeCompetitor(input.competitorUrl, homeReport.scores) : Promise.resolve(undefined),
    input.socialUrls && input.socialUrls.length ? Promise.all(input.socialUrls.slice(0, 12).map(checkSocial)) : Promise.resolve(undefined),
  ]);

  const pages = [homeReport, ...additionalReports.filter((p): p is PageReport => p !== null)];

  // Site-level scores = averages across analyzed pages.
  const siteScores = averageScores(pages.map((p) => p.scores));

  // Fix queue.
  const lang = input.lang;
  const fixQueue: FixTask[] = [];
  for (const page of pages) {
    for (const issue of page.issues) {
      const meta = FIX_TEMPLATES[issue.id];
      fixQueue.push({
        id: `${issue.id}::${page.url}`,
        priority: issue.priority,
        pageUrl: page.url,
        module: ISSUE_MODULE[issue.id] ?? "General",
        problem: ISSUE_TEXT[issue.id]?.[lang] ?? issue.id,
        whyItMatters: meta?.why[lang] ?? "",
        recommendedFix: meta?.fix[lang] ?? "",
        estimatedImpact: meta?.impact ?? "medium",
        difficulty: meta?.difficulty ?? "medium",
      });
    }
  }
  fixQueue.sort((a, b) => RANK[a.priority] - RANK[b.priority] || IMPACT_RANK[a.estimatedImpact] - IMPACT_RANK[b.estimatedImpact]);
  const cappedQueue = fixQueue.slice(0, 40);

  // Priority band.
  const criticalCount = pages.reduce((n, p) => n + p.issues.filter((i) => i.priority === "critical").length, 0);
  const priority: Priority =
    siteScores.overall < 40 || criticalCount > 0 ? "critical" : siteScores.overall < 60 ? "high" : siteScores.overall < 78 ? "medium" : "low";

  const band = SUMMARY_BAND.find((b) => siteScores.overall >= b.min) ?? SUMMARY_BAND[SUMMARY_BAND.length - 1];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    domain: domainOf(home),
    reportLanguage: lang,
    pageCount: pages.length,
    siteScores,
    priority,
    summaryText: band[lang],
    pages,
    fixQueue: cappedQueue,
    competitor: competitor && "domain" in competitor ? competitor : undefined,
    socialProfiles: socialProfiles?.filter(Boolean),
  };
}

function averageScores(list: PageScores[]): PageScores {
  const keys = Object.keys(SCORE_LABEL) as (keyof PageScores)[];
  const out = {} as PageScores;
  for (const k of keys) {
    out[k] = Math.round(list.reduce((s, sc) => s + sc[k], 0) / Math.max(1, list.length));
  }
  return out;
}

async function analyzeCompetitor(rawUrl: string, ourScores: PageScores): Promise<CompetitorComparison | undefined> {
  const url = normalizeUrl(rawUrl);
  if (!url || !(await assertPublicUrl(url))) return undefined;
  const robots = await loadRobots(new URL(url).origin);
  const report = await analyzePage(url, robots);
  if (!report) return undefined;

  const keys = Object.keys(SCORE_LABEL) as (keyof PageScores)[];
  const betterAt: string[] = [];
  const worseAt: string[] = [];
  for (const k of keys) {
    if (k === "overall") continue;
    if (ourScores[k] - report.scores[k] >= 8) betterAt.push(SCORE_LABEL[k]);
    else if (report.scores[k] - ourScores[k] >= 8) worseAt.push(SCORE_LABEL[k]);
  }
  const note =
    worseAt.length > 0
      ? `Priority opportunity: close the gap on ${worseAt.slice(0, 3).join(", ")}.`
      : "Your website matches or leads the competitor on the measured signals.";
  return { url, domain: report.domain, scores: report.scores, betterAt, worseAt, note };
}

async function checkSocial(rawUrl: string): Promise<SocialProfileCheck> {
  const url = normalizeUrl(rawUrl) ?? rawUrl;
  const platform = detectPlatform(url);
  const norm = normalizeUrl(rawUrl);
  if (!norm || !(await assertPublicUrl(norm))) {
    return { url, platform, reachable: false, note: "Could not analyze this profile because it is not publicly accessible." };
  }
  const res = await fetchText(norm);
  if (!res || res.status >= 400) {
    return { url, platform, reachable: false, note: "Could not analyze this profile because it is not publicly accessible." };
  }
  const hasTitle = /<title[\s>]/i.test(res.text) || /<meta[^>]+og:title/i.test(res.text);
  return {
    url,
    platform,
    reachable: true,
    note: hasTitle ? "Public profile reachable — reviewed for brand and link consistency." : "Reachable, but limited public metadata was available.",
  };
}
