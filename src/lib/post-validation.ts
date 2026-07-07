/**
 * Shared post validation for the standardized Varel post editor.
 *
 * Pure functions used BOTH by the client (live checklists + score) and the
 * server (publish enforcement), so the rules can never drift between them.
 */

export type SourceRef = { title: string; url: string; note?: string };

/** Everything the checks need — a flattened, serializable snapshot of a post. */
export type PostSnapshot = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImageId: string | null;
  featuredImageAlt: string;
  primaryCategoryId: string | null;
  // SEO
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  // LLM / AI search
  aiSummary: string;
  directAnswer: string;
  keyTakeaways: string[];
  bestFor: string[];
  notIdealFor: string[];
  mentionedEntityIds: string[];
  mentionedEntitiesText: string;
  faq: { question: string; answer: string }[];
  lastReviewedAt: string | null;
  reviewerId: string | null;
  // Optional modules
  prosConsEnabled: boolean;
  pros: string[];
  cons: string[];
  comparisonEnabled: boolean;
  comparisonToolAId: string | null;
  comparisonToolBId: string | null;
};

export type Check = { key: string; label: string; status: "pass" | "warn"; critical: boolean };

const textLen = (s: string) => s.trim().length;
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const hasEntities = (ids: string[], text: string) => ids.length > 0 || textLen(text) > 0;

export function contentChecks(p: PostSnapshot): Check[] {
  const plain = stripHtml(p.body);
  const words = plain ? plain.split(/\s+/).length : 0;
  const h1Count = (p.body.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (p.body.match(/<h2[\s>]/gi) || []).length;
  return [
    { key: "headline", label: "Headline added", status: textLen(p.title) > 0 ? "pass" : "warn", critical: true },
    { key: "body", label: "Article body added", status: words > 0 ? "pass" : "warn", critical: true },
    { key: "bodyLength", label: "Body has a useful length (150+ words)", status: words >= 150 ? "pass" : "warn", critical: false },
    { key: "h2", label: "At least one H2 heading", status: h2Count >= 1 ? "pass" : "warn", critical: true },
    { key: "noH1", label: "No extra H1 in the body", status: h1Count === 0 ? "pass" : "warn", critical: true },
    { key: "excerpt", label: "Excerpt written", status: textLen(p.excerpt) > 0 ? "pass" : "warn", critical: true },
    { key: "featured", label: "Featured image set", status: p.featuredImageId != null ? "pass" : "warn", critical: true },
    { key: "featuredAlt", label: "Featured image alt text", status: textLen(p.featuredImageAlt) > 0 ? "pass" : "warn", critical: true },
    { key: "category", label: "Primary category selected", status: p.primaryCategoryId != null ? "pass" : "warn", critical: true },
    { key: "internalLink", label: "Contains an internal link", status: /<a\s[^>]*href=["']\/(?!\/)/i.test(p.body) ? "pass" : "warn", critical: false },
  ];
}

export function seoChecks(p: PostSnapshot): Check[] {
  const seoTitle = p.seoTitle || p.title;
  const kw = p.focusKeyword.trim().toLowerCase();
  const intro = stripHtml(p.body).slice(0, 800).toLowerCase();
  return [
    { key: "seoTitle", label: "SEO title present", status: textLen(seoTitle) > 0 ? "pass" : "warn", critical: true },
    { key: "seoTitleLen", label: "SEO title 30–60 characters", status: seoTitle.length >= 30 && seoTitle.length <= 60 ? "pass" : "warn", critical: false },
    { key: "metaDesc", label: "Meta description present", status: textLen(p.seoDescription) > 0 ? "pass" : "warn", critical: true },
    { key: "metaDescLen", label: "Meta description 50–160 characters", status: p.seoDescription.length >= 50 && p.seoDescription.length <= 160 ? "pass" : "warn", critical: false },
    { key: "focusKw", label: "Focus keyword set", status: textLen(p.focusKeyword) > 0 ? "pass" : "warn", critical: true },
    { key: "kwInTitle", label: "Focus keyword in headline or SEO title", status: kw && (seoTitle.toLowerCase().includes(kw) || p.title.toLowerCase().includes(kw)) ? "pass" : "warn", critical: false },
    { key: "kwInIntro", label: "Focus keyword in the intro", status: kw && intro.includes(kw) ? "pass" : "warn", critical: false },
    { key: "slug", label: "Readable slug", status: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) ? "pass" : "warn", critical: true },
    { key: "canonical", label: "Canonical URL set", status: textLen(p.canonicalUrl) > 0 ? "pass" : "warn", critical: false },
    { key: "robots", label: "Robots set to index", status: p.robotsIndex ? "pass" : "warn", critical: false },
  ];
}

export function llmChecks(p: PostSnapshot): Check[] {
  return [
    { key: "aiSummary", label: "Short answer summary", status: textLen(p.aiSummary) > 0 ? "pass" : "warn", critical: true },
    { key: "directAnswer", label: "Direct answer paragraph", status: textLen(p.directAnswer) > 0 ? "pass" : "warn", critical: true },
    { key: "takeaways", label: "At least 3 key takeaways", status: p.keyTakeaways.filter((t) => t.trim()).length >= 3 ? "pass" : "warn", critical: true },
    { key: "bestFor", label: "“Best for” list completed", status: p.bestFor.filter((t) => t.trim()).length >= 1 ? "pass" : "warn", critical: true },
    { key: "notIdealFor", label: "“Not ideal for” list completed", status: p.notIdealFor.filter((t) => t.trim()).length >= 1 ? "pass" : "warn", critical: true },
    { key: "entities", label: "Tools / entities mentioned", status: hasEntities(p.mentionedEntityIds, p.mentionedEntitiesText) ? "pass" : "warn", critical: true },
    { key: "faq", label: "At least 2 FAQ items", status: p.faq.filter((f) => f.question.trim() && f.answer.trim()).length >= 2 ? "pass" : "warn", critical: true },
    { key: "lastReviewed", label: "Last updated date", status: p.lastReviewedAt != null ? "pass" : "warn", critical: true },
    { key: "reviewer", label: "Author / reviewer set", status: p.reviewerId != null ? "pass" : "warn", critical: true },
  ];
}

export function moduleChecks(p: PostSnapshot): Check[] {
  const checks: Check[] = [];
  if (p.prosConsEnabled) {
    checks.push({ key: "pros", label: "At least one pro", status: p.pros.filter((x) => x.trim()).length >= 1 ? "pass" : "warn", critical: true });
    checks.push({ key: "cons", label: "At least one con", status: p.cons.filter((x) => x.trim()).length >= 1 ? "pass" : "warn", critical: true });
  }
  if (p.comparisonEnabled) {
    const bothSet = Boolean(p.comparisonToolAId && p.comparisonToolBId);
    const distinct = p.comparisonToolAId !== p.comparisonToolBId;
    checks.push({ key: "cmpTools", label: "Comparison: both tools selected", status: bothSet ? "pass" : "warn", critical: true });
    checks.push({ key: "cmpDistinct", label: "Comparison: two different tools", status: bothSet && distinct ? "pass" : "warn", critical: true });
  }
  return checks;
}

export function score(checks: Check[]): number {
  if (checks.length === 0) return 100;
  return Math.round((checks.filter((c) => c.status === "pass").length / checks.length) * 100);
}

/** Returns the list of unmet CRITICAL checks. Publish is allowed only if empty. */
export function blockingIssues(p: PostSnapshot): Check[] {
  return [...contentChecks(p), ...seoChecks(p), ...llmChecks(p), ...moduleChecks(p)].filter(
    (c) => c.critical && c.status !== "pass"
  );
}

export function canPublish(p: PostSnapshot): boolean {
  return blockingIssues(p).length === 0;
}
