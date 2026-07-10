import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { parse, type HTMLElement } from "node-html-parser";
import { AI_CRAWLERS, FLUFF_PHRASES, ISSUE_TEXT, type Lang } from "./data";

const UA = "VarelLLMScanner/1.0 (+https://varel.io)";
const FETCH_TIMEOUT = 9_000;
const MAX_BYTES = 3_000_000; // 3 MB HTML cap

export type Priority = "critical" | "high" | "medium" | "low";
export type ScanIssue = { id: string; priority: Priority; text: string };

export type PageScores = {
  overall: number;
  technicalCrawlability: number;
  contentExtractability: number;
  schemaReadiness: number;
  crawlerPolicy: number;
  visualConsistency: number;
};

export type PageFacts = {
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  h1Count: number;
  headingCount: number;
  wordCount: number;
  schemaTypes: string[];
  imagesTotal: number;
  imagesNoAlt: number;
  faqPresent: boolean;
  canonical: string | null;
  noindex: boolean;
  hasRobots: boolean;
  sitemapReferenced: boolean;
  blockedAiBots: string[];
  fluffHits: string[];
  pageType: string;
  internalLinksCount: number;
  externalLinksCount: number;
};

export type PageReport = {
  url: string;
  domain: string;
  pageType: string;
  fetchedAt: string;
  scores: PageScores;
  facts: PageFacts;
  issues: { id: string; priority: Priority }[];
  internalLinks: string[];
};

/** Free-scan response shape (kept stable for the public API + report pages). */
export type FreeScanResult = {
  ok: true;
  url: string;
  domain: string;
  fetchedAt: string;
  scores: PageScores;
  facts: Omit<PageFacts, "pageType" | "internalLinksCount" | "externalLinksCount"> & Partial<PageFacts>;
  topIssues: ScanIssue[];
};
export type ScanFailure = { ok: false; reason: "invalid_url" | "blocked_host" | "unreachable" | "not_html" };

/* ---------------- URL validation + SSRF protection ---------------- */

export function normalizeUrl(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") || low === "::";
  }
  return true;
}

export async function assertPublicUrl(url: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return false;
  if (net.isIP(host) && isPrivateIp(host)) return false;
  try {
    const records = await dns.lookup(host, { all: true });
    if (records.length === 0) return false;
    for (const r of records) if (isPrivateIp(r.address)) return false;
  } catch {
    return false;
  }
  return true;
}

export async function fetchText(url: string): Promise<{ status: number; text: string; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const contentType = res.headers.get("content-type") ?? "";
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { status: res.status, text: text.slice(0, MAX_BYTES), contentType };
    }
    let received = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      chunks.push(value);
      if (received > MAX_BYTES) { reader.cancel().catch(() => {}); break; }
    }
    return { status: res.status, text: Buffer.concat(chunks).toString("utf8"), contentType };
  } catch {
    return null;
  }
}

/* ---------------- robots.txt ---------------- */

export type RobotsGroup = { agents: string[]; disallows: string[] };
export type RobotsContext = { groups: RobotsGroup[]; hasRobots: boolean; sitemapReferenced: boolean; sitemapUrls: string[] };

export function parseRobots(txt: string): { groups: RobotsGroup[]; sitemapUrls: string[] } {
  const groups: RobotsGroup[] = [];
  const sitemapUrls: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], disallows: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (key === "disallow" && current) {
      current.disallows.push(val);
      lastWasAgent = false;
    } else if (key === "sitemap") {
      if (val) sitemapUrls.push(val);
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemapUrls };
}

function botBlocked(groups: RobotsGroup[], ua: string): boolean {
  const uaLower = ua.toLowerCase();
  const group = groups.find((g) => g.agents.includes(uaLower)) ?? groups.find((g) => g.agents.includes("*"));
  return group ? group.disallows.some((d) => d === "/") : false;
}

/** Fetches robots.txt for an origin and returns a reusable context. */
export async function loadRobots(origin: string): Promise<RobotsContext> {
  const res = await fetchText(`${origin}/robots.txt`);
  const hasRobots = Boolean(res && res.status === 200 && res.text.trim());
  if (!hasRobots) return { groups: [], hasRobots: false, sitemapReferenced: false, sitemapUrls: [] };
  const { groups, sitemapUrls } = parseRobots(res!.text);
  return { groups, hasRobots: true, sitemapReferenced: sitemapUrls.length > 0, sitemapUrls };
}

/* ---------------- helpers ---------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function bodyTextOf(root: HTMLElement): string {
  root.querySelectorAll("script,style,noscript,template").forEach((e) => e.remove());
  return root.querySelector("body")?.text.replace(/\s+/g, " ").trim() ?? "";
}

export function detectPageType(url: string, title: string | null, schemaTypes: string[]): string {
  let path = "/";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch { /* keep default */ }
  if (path === "/" || path === "") return "homepage";
  if (schemaTypes.includes("FAQPage")) return "faq";
  if (schemaTypes.some((t) => ["Article", "BlogPosting"].includes(t)) || /\/(blog|news|guide|guides|article|post)s?\//.test(path)) return "article";
  if (schemaTypes.includes("Product") || /\/(product|shop|store|item)s?\//.test(path)) return "product";
  if (/about|o-nama|tko-smo/.test(path)) return "about";
  if (/pricing|cijen|plans/.test(path)) return "pricing";
  if (/contact|kontakt/.test(path)) return "contact";
  if (/services?|usluge|solutions?/.test(path)) return "services";
  if (/faq|pitanja/.test(path)) return "faq";
  const t = (title ?? "").toLowerCase();
  if (/pricing|cijen/.test(t)) return "pricing";
  if (/about|o nama/.test(t)) return "about";
  return "page";
}

/** Core deterministic per-page analysis. Reused by free scan + detailed report. */
export function analyzeDocument(url: string, html: string, status: number, robots: RobotsContext): PageReport {
  const root = parse(html, { comment: false });

  const title = root.querySelector("title")?.text.trim() || null;
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || null;
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
  const robotsMeta = (root.querySelector('meta[name="robots"]')?.getAttribute("content") || "").toLowerCase();
  const noindex = robotsMeta.includes("noindex");
  const themeColor = root.querySelector('meta[name="theme-color"]')?.getAttribute("content") || null;
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
  const viewport = root.querySelector('meta[name="viewport"]');
  const stylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

  const h1s = root.querySelectorAll("h1");
  const h1 = h1s[0]?.text.trim() || null;
  const headingCount = root.querySelectorAll("h1,h2,h3").length;
  const bodyText = bodyTextOf(root);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  const imgs = root.querySelectorAll("img");
  const imagesTotal = imgs.length;
  const imagesNoAlt = imgs.filter((i) => !(i.getAttribute("alt") || "").trim()).length;

  // Links → internal / external
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* */ }
  const internalLinks = new Set<string>();
  let externalLinksCount = 0;
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, url);
      if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
      if (abs.hostname.replace(/^www\./, "") === host) internalLinks.add(abs.toString().split("#")[0]);
      else externalLinksCount++;
    } catch { /* skip bad href */ }
  }

  // Schema (JSON-LD)
  const schemaTypes = new Set<string>();
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const collect = (o: unknown) => {
        if (!o) return;
        if (Array.isArray(o)) return o.forEach(collect);
        if (typeof o === "object") {
          const t = (o as Record<string, unknown>)["@type"];
          if (typeof t === "string") schemaTypes.add(t);
          else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && schemaTypes.add(x));
          const graph = (o as Record<string, unknown>)["@graph"];
          if (graph) collect(graph);
        }
      };
      collect(JSON.parse(s.text));
    } catch { /* invalid json-ld */ }
  }
  const schemaArr = [...schemaTypes];

  const lowerText = bodyText.toLowerCase();
  const faqPresent = schemaArr.includes("FAQPage") || /frequently asked questions|\bfaq\b|česta pitanja/i.test(bodyText);
  const hasAnswerBlock = /^(.{0,160})(is|are|offers|provides|helps|we are|specializes)/i.test(bodyText.slice(0, 200)) || faqPresent;
  const fluffHits = FLUFF_PHRASES.filter((p) => lowerText.includes(p));

  const searchBots = AI_CRAWLERS.filter((c) => c.kind === "search" || c.kind === "both");
  const blockedAiBots = robots.hasRobots ? searchBots.filter((c) => botBlocked(robots.groups, c.ua)).map((c) => c.ua) : [];

  /* scoring */
  let tech = 100;
  if (status !== 200) tech -= 30;
  if (noindex) tech -= 40;
  if (!title) tech -= 15;
  if (!canonical) tech -= 10;
  if (!robots.hasRobots) tech -= 10;
  if (!robots.sitemapReferenced) tech -= 8;
  const technicalCrawlability = clamp(tech);

  let content = Math.min(55, wordCount / 12);
  if (h1) content += 12; else content -= 5;
  if (metaDescription) content += 10;
  if (headingCount >= 3) content += 10;
  if (faqPresent) content += 10;
  if (hasAnswerBlock) content += 6;
  content -= Math.min(15, fluffHits.length * 3);
  if (wordCount < 120) content -= 20;
  const contentExtractability = clamp(content);

  let schema = schemaArr.length ? 25 : 8;
  if (schemaArr.some((t) => t === "Organization" || t === "LocalBusiness")) schema += 22;
  if (schemaArr.includes("WebSite")) schema += 12;
  if (schemaArr.includes("FAQPage")) schema += 14;
  if (schemaArr.includes("BreadcrumbList")) schema += 10;
  if (schemaArr.some((t) => ["Article", "BlogPosting", "Product", "SoftwareApplication"].includes(t))) schema += 12;
  const schemaReadiness = clamp(schema);

  let policy = 100 - blockedAiBots.length * 14;
  if (!robots.hasRobots) policy = 72;
  const crawlerPolicy = clamp(policy);

  let visual = 55;
  if (themeColor) visual += 10;
  if (ogImage) visual += 12;
  if (viewport) visual += 12;
  if (stylesheets > 0) visual += 8;
  if (imagesTotal > 0 && imagesNoAlt / imagesTotal > 0.5) visual -= 8;
  const visualConsistency = clamp(visual);

  const overall = clamp(
    technicalCrawlability * 0.22 + contentExtractability * 0.26 + schemaReadiness * 0.2 + crawlerPolicy * 0.16 + visualConsistency * 0.16
  );

  /* issues */
  const issues: { id: string; priority: Priority }[] = [];
  if (noindex) issues.push({ id: "noindex", priority: "critical" });
  if (!title) issues.push({ id: "no_title", priority: "high" });
  if (!metaDescription) issues.push({ id: "no_meta_description", priority: "high" });
  if (!h1) issues.push({ id: "no_h1", priority: "high" });
  else if (h1s.length > 1) issues.push({ id: "multiple_h1", priority: "medium" });
  if (wordCount < 120) issues.push({ id: "thin_content", priority: "high" });
  if (schemaArr.length === 0) issues.push({ id: "no_schema", priority: "high" });
  else if (!schemaArr.some((t) => t === "Organization" || t === "LocalBusiness")) issues.push({ id: "no_org_schema", priority: "medium" });
  if (!faqPresent) issues.push({ id: "no_faq", priority: "medium" });
  if (blockedAiBots.length) issues.push({ id: "ai_bots_blocked", priority: "critical" });
  if (!robots.hasRobots) issues.push({ id: "no_robots", priority: "medium" });
  if (!robots.sitemapReferenced) issues.push({ id: "no_sitemap", priority: "low" });
  if (imagesTotal > 0 && imagesNoAlt > 0) issues.push({ id: "images_no_alt", priority: "medium" });
  if (!canonical) issues.push({ id: "no_canonical", priority: "low" });
  if (!hasAnswerBlock) issues.push({ id: "weak_answer_blocks", priority: "medium" });
  if (fluffHits.length >= 2) issues.push({ id: "fluff", priority: "low" });

  const pageType = detectPageType(url, title, schemaArr);

  return {
    url,
    domain: domainOf(url),
    pageType,
    fetchedAt: new Date().toISOString(),
    scores: { overall, technicalCrawlability, contentExtractability, schemaReadiness, crawlerPolicy, visualConsistency },
    facts: {
      statusCode: status, title, metaDescription, h1, h1Count: h1s.length, headingCount, wordCount,
      schemaTypes: schemaArr, imagesTotal, imagesNoAlt, faqPresent, canonical, noindex,
      hasRobots: robots.hasRobots, sitemapReferenced: robots.sitemapReferenced, blockedAiBots, fluffHits,
      pageType, internalLinksCount: internalLinks.size, externalLinksCount,
    },
    issues,
    internalLinks: [...internalLinks],
  };
}

/** Fetch + analyze a single page (used for additional/competitor pages). */
export async function analyzePage(url: string, robots: RobotsContext): Promise<PageReport | null> {
  const norm = normalizeUrl(url);
  if (!norm || !(await assertPublicUrl(norm))) return null;
  const page = await fetchText(norm);
  if (!page || (!/html/i.test(page.contentType) && !/<html/i.test(page.text))) return null;
  return analyzeDocument(norm, page.text, page.status, robots);
}

const RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/* ---------------- free scan (homepage only) ---------------- */

export async function runFreeScan(rawUrl: string): Promise<FreeScanResult | ScanFailure> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, reason: "invalid_url" };
  if (!(await assertPublicUrl(url))) return { ok: false, reason: "blocked_host" };

  const page = await fetchText(url);
  if (!page) return { ok: false, reason: "unreachable" };
  if (!/html/i.test(page.contentType) && !/<html/i.test(page.text)) return { ok: false, reason: "not_html" };

  const robots = await loadRobots(new URL(url).origin);
  const report = analyzeDocument(url, page.text, page.status, robots);

  return {
    ok: true,
    url: report.url,
    domain: report.domain,
    fetchedAt: report.fetchedAt,
    scores: report.scores,
    facts: report.facts,
    topIssues: report.issues
      .sort((a, b) => RANK[a.priority] - RANK[b.priority])
      .slice(0, 3)
      .map((i) => ({ id: i.id, priority: i.priority, text: ISSUE_TEXT[i.id]?.en ?? i.id })),
  };
}

export function localizeIssues(issues: ScanIssue[], lang: Lang): ScanIssue[] {
  return issues.map((i) => ({ ...i, text: ISSUE_TEXT[i.id]?.[lang] ?? i.text }));
}

/* ---------------- sitemap + auto page detection ---------------- */

export function parseSitemapXml(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return locs;
}

/** Fetches sitemaps (from robots + /sitemap.xml), following one level of index. */
export async function collectSitemapUrls(origin: string, robots: RobotsContext): Promise<string[]> {
  const seeds = robots.sitemapUrls.length ? robots.sitemapUrls.slice(0, 3) : [`${origin}/sitemap.xml`];
  const out = new Set<string>();
  for (const seed of seeds) {
    const res = await fetchText(seed);
    if (!res || res.status !== 200) continue;
    const locs = parseSitemapXml(res.text);
    // If it's a sitemap index, fetch the first child sitemap.
    if (/<sitemapindex/i.test(res.text) && locs.length) {
      const child = await fetchText(locs[0]);
      if (child && child.status === 200) parseSitemapXml(child.text).forEach((u) => out.add(u));
    } else {
      locs.forEach((u) => out.add(u));
    }
    if (out.size > 200) break;
  }
  return [...out];
}

const IMPORTANT_PATHS = [
  { re: /\/(about|o-nama|tko-smo)/i, score: 10 },
  { re: /\/(services?|usluge|solutions?)/i, score: 9 },
  { re: /\/(pricing|cijen|plans)/i, score: 9 },
  { re: /\/(product|proizvod|shop)/i, score: 7 },
  { re: /\/(contact|kontakt)/i, score: 6 },
  { re: /\/(features?|kako-radi|how-it-works)/i, score: 6 },
  { re: /\/(faq|pitanja)/i, score: 5 },
  { re: /\/(blog|news|guide|guides)/i, score: 3 },
];

/** Picks up to `limit` important additional URLs from sitemap + internal links. */
export function pickAutoDetectPages(homepageUrl: string, homepageInternalLinks: string[], sitemapUrls: string[], limit = 4): string[] {
  let host = "";
  try { host = new URL(homepageUrl).hostname.replace(/^www\./, ""); } catch { /* */ }
  const homeNorm = homepageUrl.replace(/\/+$/, "");
  const candidates = new Map<string, number>();

  const consider = (u: string) => {
    try {
      const url = new URL(u);
      if (url.hostname.replace(/^www\./, "") !== host) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      const clean = `${url.origin}${url.pathname}`.replace(/\/+$/, "");
      if (!clean || clean === homeNorm) return;
      const depth = url.pathname.split("/").filter(Boolean).length;
      if (depth > 3) return; // prefer shallow, important pages
      let score = 2 - depth; // shallower is better
      for (const p of IMPORTANT_PATHS) if (p.re.test(url.pathname)) { score += p.score; break; }
      candidates.set(clean, Math.max(candidates.get(clean) ?? -Infinity, score));
    } catch { /* skip */ }
  };

  sitemapUrls.forEach(consider);
  homepageInternalLinks.forEach(consider);

  return [...candidates.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([u]) => u);
}
