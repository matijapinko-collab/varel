import type { PageFacts, PageScores } from "./scan";
import type { RenderedPageAnalysis } from "./renderer";
import type { Lang } from "./data";

/**
 * Static-HTML vs rendered-DOM comparison + the split extractability scoring.
 * Pure functions — deterministic, no API. Degrades to static-only when the
 * renderer was skipped/failed.
 */

export type JsDependency = "low" | "medium" | "high" | "critical";

export type RenderDeltaAnalysis = {
  available: boolean;
  staticWordCount: number;
  renderedWordCount: number;
  staticToRenderedWordRatio: number;
  renderedContentGainPercent: number;
  staticHeadingCount: number;
  renderedHeadingCount: number;
  staticLinkCount: number;
  renderedLinkCount: number;
  staticImageCount: number;
  renderedImageCount: number;
  jsDependencyLevel: JsDependency;
  summary: string;
  warnings: string[];
};

export type ExtractabilityBreakdown = {
  staticHtmlReadability: number;
  renderedDomReadability?: number;
  semanticStructure: number;
  jsDependencyRisk?: number;
  finalExtractability: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const JS_SUMMARY: Record<JsDependency, { en: string; hr: string }> = {
  low: {
    en: "Most important content is available in the static HTML. This is good for crawler accessibility and AI/search extraction.",
    hr: "Većina važnog sadržaja dostupna je u statičkom HTML-u. To je dobro za pristupačnost crawlerima i AI/search izvlačenje.",
  },
  medium: {
    en: "The rendered page contains noticeably more content than the static HTML. Most modern crawlers may still process it, but important content should ideally be available server-side.",
    hr: "Renderirana stranica sadrži primjetno više sadržaja od statičkog HTML-a. Većina modernih crawlera to može obraditi, ali važan sadržaj idealno bi trebao biti dostupan server-side.",
  },
  high: {
    en: "The page depends heavily on JavaScript for meaningful content. This may reduce extractability for systems that rely on raw HTML or limited rendering.",
    hr: "Stranica se snažno oslanja na JavaScript za sadržaj. To može smanjiti izvučivost za sustave koji se oslanjaju na sirovi HTML ili ograničeno renderiranje.",
  },
  critical: {
    en: "The static HTML contains very little useful content, while the rendered DOM contains most of the page. This is risky for AI/search readability. Consider server-side rendering or static generation for important content.",
    hr: "Statički HTML sadrži vrlo malo korisnog sadržaja, dok renderirani DOM sadrži većinu stranice. To je rizično za AI/search čitljivost. Razmotri server-side rendering ili statičku generaciju za važan sadržaj.",
  },
};

function classifyJsDependency(staticWords: number, renderedWords: number, gainPercent: number): JsDependency {
  if (staticWords < 100 && renderedWords >= 500) return "critical";
  if (gainPercent > 300) return "critical";
  if (gainPercent >= 100) return "high";
  if (gainPercent >= 25) return "medium";
  return "low";
}

export function analyzeRenderDelta(staticFacts: PageFacts, rendered: RenderedPageAnalysis, lang: Lang): RenderDeltaAnalysis {
  const available = rendered.renderStatus === "success";
  const staticWordCount = staticFacts.wordCount;
  const renderedWordCount = rendered.renderedWordCount ?? staticWordCount;
  const ratio = Math.round((renderedWordCount / Math.max(staticWordCount, 1)) * 100) / 100;
  const gain = Math.round(((renderedWordCount - staticWordCount) / Math.max(staticWordCount, 1)) * 100);
  const level = available ? classifyJsDependency(staticWordCount, renderedWordCount, gain) : "low";

  const warnings: string[] = [];
  if (available && (level === "high" || level === "critical")) {
    warnings.push(
      lang === "hr"
        ? "Važan sadržaj se pojavljuje tek nakon renderiranja JavaScripta."
        : "Important content only appears after JavaScript rendering."
    );
  }

  return {
    available,
    staticWordCount,
    renderedWordCount,
    staticToRenderedWordRatio: ratio,
    renderedContentGainPercent: gain,
    staticHeadingCount: staticFacts.headingCount,
    renderedHeadingCount: rendered.renderedHeadingCount ?? staticFacts.headingCount,
    staticLinkCount: staticFacts.internalLinksCount + staticFacts.externalLinksCount,
    renderedLinkCount: rendered.renderedLinkCount ?? staticFacts.internalLinksCount + staticFacts.externalLinksCount,
    staticImageCount: staticFacts.imagesTotal,
    renderedImageCount: rendered.renderedImageCount ?? staticFacts.imagesTotal,
    jsDependencyLevel: level,
    summary: available ? JS_SUMMARY[level][lang] : (lang === "hr" ? "Renderirana analiza nije bila dostupna; prikazana je samo statička analiza." : "Rendered analysis was unavailable; static-only analysis is shown."),
    warnings,
  };
}

function jsRiskScore(level: JsDependency): number {
  return { low: 100, medium: 75, high: 45, critical: 20 }[level];
}

function renderedReadability(rendered: RenderedPageAnalysis): number {
  const words = rendered.renderedWordCount ?? 0;
  let s = Math.min(60, words / 12);
  if (rendered.renderedH1) s += 12;
  if ((rendered.renderedHeadingCount ?? 0) >= 3) s += 10;
  if (words >= 300) s += 10;
  if (words < 120) s -= 20;
  return clamp(s);
}

function semanticStructureScore(staticFacts: PageFacts, rendered: RenderedPageAnalysis): number {
  const imagesTotal = rendered.renderedImageCount ?? staticFacts.imagesTotal;
  const imagesNoAlt = rendered.renderedImagesNoAlt ?? staticFacts.imagesNoAlt;
  const headings = rendered.renderedHeadingCount ?? staticFacts.headingCount;
  const buttonsNoName = rendered.buttonsWithoutName ?? 0;
  let s = 85;
  if (headings < 1) s -= 25;
  else if (headings < 3) s -= 8;
  if (imagesTotal > 0) s -= Math.min(20, (imagesNoAlt / imagesTotal) * 20);
  s -= Math.min(15, buttonsNoName * 3);
  if (!staticFacts.h1 && !rendered.renderedH1) s -= 10;
  return clamp(s);
}

/**
 * Splits Content Extractability into: static readability, rendered readability,
 * semantic structure and JS-dependency risk → a final blended score.
 * When render is unavailable, final ≈ static readability.
 */
export function computeExtractability(
  staticReadability: number,
  staticFacts: PageFacts,
  rendered: RenderedPageAnalysis | null,
  delta: RenderDeltaAnalysis | null
): ExtractabilityBreakdown {
  const semantic = semanticStructureScore(staticFacts, rendered ?? ({ renderStatus: "skipped" } as RenderedPageAnalysis));

  if (!rendered || rendered.renderStatus !== "success" || !delta) {
    // Static-only: blend static readability with semantic structure.
    const final = clamp(staticReadability * 0.8 + semantic * 0.2);
    return { staticHtmlReadability: staticReadability, semanticStructure: semantic, finalExtractability: final };
  }

  const renderedDom = renderedReadability(rendered);
  const jsRisk = jsRiskScore(delta.jsDependencyLevel);
  const final = clamp(staticReadability * 0.4 + renderedDom * 0.35 + semantic * 0.15 + jsRisk * 0.1);
  return {
    staticHtmlReadability: staticReadability,
    renderedDomReadability: renderedDom,
    semanticStructure: semantic,
    jsDependencyRisk: jsRisk,
    finalExtractability: final,
  };
}

/** Poor-contrast detection for the fix queue (uses rendered visual styles). */
export function contrastIssues(rendered: RenderedPageAnalysis): boolean {
  return Boolean(rendered.visualStyles?.contrastChecks.some((c) => !c.passAA));
}

/** Merge the blended final extractability back into a page's headline scores. */
export function applyExtractability(base: PageScores, breakdown: ExtractabilityBreakdown): PageScores {
  const contentExtractability = breakdown.finalExtractability;
  const overall = clamp(
    base.technicalCrawlability * 0.22 + contentExtractability * 0.26 + base.schemaReadiness * 0.2 + base.crawlerPolicy * 0.16 + base.visualConsistency * 0.16
  );
  return { ...base, contentExtractability, overall };
}
