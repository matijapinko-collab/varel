import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { parse, type HTMLElement } from "node-html-parser";
import { AI_CRAWLERS, FLUFF_PHRASES, ISSUE_TEXT, type Lang } from "./data";

const UA = "VarelLLMScanner/1.0 (+https://varel.io)";
const FETCH_TIMEOUT = 12_000;
const MAX_BYTES = 3_000_000; // 3 MB HTML cap

export type ScanIssue = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  text: string;
};

export type FreeScanResult = {
  ok: true;
  url: string;
  domain: string;
  fetchedAt: string;
  scores: {
    overall: number;
    technicalCrawlability: number;
    contentExtractability: number;
    schemaReadiness: number;
    crawlerPolicy: number;
    visualConsistency: number;
  };
  facts: {
    statusCode: number;
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    h1Count: number;
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
  };
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
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") || low === "::";
  }
  return true; // unknown → treat as unsafe
}

/** Blocks localhost, private ranges and non-http(s). Resolves DNS to catch rebinding. */
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

async function fetchText(url: string): Promise<{ status: number; text: string; contentType: string } | null> {
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
    const text = Buffer.concat(chunks).toString("utf8");
    return { status: res.status, text, contentType };
  } catch {
    return null;
  }
}

/* ---------------- robots.txt analysis ---------------- */

type RobotsGroup = { agents: string[]; disallows: string[] };

function parseRobots(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
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
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function botBlocked(groups: RobotsGroup[], ua: string): boolean {
  const uaLower = ua.toLowerCase();
  const specific = groups.find((g) => g.agents.includes(uaLower));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const group = specific ?? wildcard;
  if (!group) return false;
  return group.disallows.some((d) => d === "/" );
}

/* ---------------- helpers ---------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function textContent(root: HTMLElement): string {
  root.querySelectorAll("script,style,noscript,template").forEach((e) => e.remove());
  return root.querySelector("body")?.text.replace(/\s+/g, " ").trim() ?? "";
}

/* ---------------- main free scan ---------------- */

export async function runFreeScan(rawUrl: string): Promise<FreeScanResult | ScanFailure> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, reason: "invalid_url" };
  if (!(await assertPublicUrl(url))) return { ok: false, reason: "blocked_host" };

  const page = await fetchText(url);
  if (!page) return { ok: false, reason: "unreachable" };
  if (!/html/i.test(page.contentType) && !/<html/i.test(page.text)) return { ok: false, reason: "not_html" };

  const origin = new URL(url).origin;
  const robotsRes = await fetchText(`${origin}/robots.txt`);
  const hasRobots = Boolean(robotsRes && robotsRes.status === 200 && robotsRes.text.trim());
  const robotsGroups = hasRobots ? parseRobots(robotsRes!.text) : [];
  const sitemapReferenced = hasRobots ? /sitemap:/i.test(robotsRes!.text) : false;

  const root = parse(page.text, { comment: false });

  // Metadata
  const title = root.querySelector("title")?.text.trim() || null;
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || null;
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
  const robotsMeta = (root.querySelector('meta[name="robots"]')?.getAttribute("content") || "").toLowerCase();
  const noindex = robotsMeta.includes("noindex");
  const themeColor = root.querySelector('meta[name="theme-color"]')?.getAttribute("content") || null;
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
  const viewport = root.querySelector('meta[name="viewport"]');
  const stylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

  // Headings + content
  const h1s = root.querySelectorAll("h1");
  const h1 = h1s[0]?.text.trim() || null;
  const headingCount = root.querySelectorAll("h1,h2,h3").length;
  const bodyText = textContent(root);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  // Images
  const imgs = root.querySelectorAll("img");
  const imagesTotal = imgs.length;
  const imagesNoAlt = imgs.filter((i) => !(i.getAttribute("alt") || "").trim()).length;

  // Schema (JSON-LD)
  const schemaTypes = new Set<string>();
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = JSON.parse(s.text);
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
      collect(json);
    } catch {
      /* invalid json-ld — ignore */
    }
  }
  const schemaArr = [...schemaTypes];

  // Answer blocks / FAQ
  const lowerText = bodyText.toLowerCase();
  const faqPresent = schemaArr.includes("FAQPage") || /frequently asked questions|\bfaq\b|česta pitanja/i.test(bodyText);
  const hasAnswerBlock = /^(.{0,160})(is|are|offers|provides|helps|we are|specializes)/i.test(bodyText.slice(0, 200)) || faqPresent;

  // Fluff
  const fluffHits = FLUFF_PHRASES.filter((p) => lowerText.includes(p));

  // AI crawler policy
  const searchBots = AI_CRAWLERS.filter((c) => c.kind === "search" || c.kind === "both");
  const blockedAiBots = hasRobots ? searchBots.filter((c) => botBlocked(robotsGroups, c.ua)).map((c) => c.ua) : [];

  /* ---------- scoring ---------- */
  let tech = 100;
  if (page.status !== 200) tech -= 30;
  if (noindex) tech -= 40;
  if (!title) tech -= 15;
  if (!canonical) tech -= 10;
  if (!hasRobots) tech -= 10;
  if (!sitemapReferenced) tech -= 8;
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

  let policy = 100;
  policy -= blockedAiBots.length * 14;
  if (!hasRobots) policy = 72; // undefined = allowed but no explicit signal
  const crawlerPolicy = clamp(policy);

  let visual = 55;
  if (themeColor) visual += 10;
  if (ogImage) visual += 12;
  if (viewport) visual += 12;
  if (stylesheets > 0) visual += 8;
  if (imagesTotal > 0 && imagesNoAlt / imagesTotal > 0.5) visual -= 8;
  const visualConsistency = clamp(visual);

  const overall = clamp(
    technicalCrawlability * 0.22 +
      contentExtractability * 0.26 +
      schemaReadiness * 0.2 +
      crawlerPolicy * 0.16 +
      visualConsistency * 0.16
  );

  /* ---------- issues ---------- */
  const issues: { id: string; priority: ScanIssue["priority"] }[] = [];
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
  if (!hasRobots) issues.push({ id: "no_robots", priority: "medium" });
  if (!sitemapReferenced) issues.push({ id: "no_sitemap", priority: "low" });
  if (imagesTotal > 0 && imagesNoAlt > 0) issues.push({ id: "images_no_alt", priority: "medium" });
  if (!canonical) issues.push({ id: "no_canonical", priority: "low" });
  if (!hasAnswerBlock) issues.push({ id: "weak_answer_blocks", priority: "medium" });
  if (fluffHits.length >= 2) issues.push({ id: "fluff", priority: "low" });

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };

  return {
    ok: true,
    url,
    domain: domainOf(url),
    fetchedAt: new Date().toISOString(),
    scores: { overall, technicalCrawlability, contentExtractability, schemaReadiness, crawlerPolicy, visualConsistency },
    facts: {
      statusCode: page.status,
      title,
      metaDescription,
      h1,
      h1Count: h1s.length,
      wordCount,
      schemaTypes: schemaArr,
      imagesTotal,
      imagesNoAlt,
      faqPresent,
      canonical,
      noindex,
      hasRobots,
      sitemapReferenced,
      blockedAiBots,
      fluffHits,
    },
    topIssues: issues
      .sort((a, b) => rank[a.priority] - rank[b.priority])
      .slice(0, 3)
      .map((i) => ({ id: i.id, priority: i.priority, text: ISSUE_TEXT[i.id]?.en ?? i.id })),
  };
}

/** Localizes issue text for a given language. */
export function localizeIssues(issues: ScanIssue[], lang: Lang): ScanIssue[] {
  return issues.map((i) => ({ ...i, text: ISSUE_TEXT[i.id]?.[lang] ?? i.text }));
}
