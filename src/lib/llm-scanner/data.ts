/**
 * Static data + copy for the Varel LLM Visibility Scanner.
 * The scanner is fully deterministic — NO LLM/AI API is used anywhere.
 */

/** AI / search crawlers whose robots.txt access we report on. */
export const AI_CRAWLERS: { ua: string; label: string; kind: "search" | "training" | "both" }[] = [
  { ua: "Googlebot", label: "Googlebot (Google Search)", kind: "search" },
  { ua: "Bingbot", label: "Bingbot (Bing / Copilot)", kind: "search" },
  { ua: "OAI-SearchBot", label: "OAI-SearchBot (ChatGPT Search)", kind: "search" },
  { ua: "GPTBot", label: "GPTBot (OpenAI training)", kind: "training" },
  { ua: "ChatGPT-User", label: "ChatGPT-User (ChatGPT browsing)", kind: "search" },
  { ua: "Google-Extended", label: "Google-Extended (Gemini training)", kind: "training" },
  { ua: "ClaudeBot", label: "ClaudeBot (Anthropic)", kind: "both" },
  { ua: "Claude-SearchBot", label: "Claude-SearchBot", kind: "search" },
  { ua: "PerplexityBot", label: "PerplexityBot", kind: "search" },
  { ua: "CCBot", label: "CCBot (Common Crawl)", kind: "training" },
];

/** Generic AI-fluff phrases that reduce content clarity. */
export const FLUFF_PHRASES = [
  "in today's digital world",
  "in today's fast-paced world",
  "game-changer",
  "game changer",
  "boost productivity",
  "seamlessly",
  "revolutionize your workflow",
  "revolutionize",
  "unlock the power",
  "unlock the full potential",
  "take your business to the next level",
  "whether you are a beginner or professional",
  "whether you're a beginner or a pro",
  "cutting-edge",
  "state-of-the-art",
  "elevate your",
  "supercharge",
  "one-stop shop",
  "world-class",
  "best-in-class",
];

/** Schema types that matter most for AI answer engines. */
export const IMPORTANT_SCHEMA = [
  "Organization",
  "LocalBusiness",
  "WebSite",
  "BreadcrumbList",
  "Article",
  "BlogPosting",
  "FAQPage",
  "Product",
  "SoftwareApplication",
  "Person",
];

export const PRICING = {
  base: 20,
  socialAddon: 10,
  competitorAddon: 10,
} as const;

export type Lang = "en" | "hr";

/** All user-facing copy, EN + HR. */
export const COPY = {
  en: {
    h1: "LLM Visibility Scanner",
    subtitle:
      "Check how ready your website is for ChatGPT Search, Google AI Search, Perplexity, Claude-style search assistants and modern AI answer engines.",
    heroBody:
      "See how ready your website is for AI search and modern answer engines. Varel analyzes what crawlers and AI/search systems can read: your HTML, rendered content, metadata, schema, AI crawler policy, content clarity, entity structure, answer blocks and visual consistency.",
    runScan: "Run free scan",
    detailedCta: "Get detailed report for 20 €",
    freeNote: "Free basic scan requires your email. Detailed report is available for 20 €.",
    urlLabel: "Website URL",
    emailLabel: "Email",
    langLabel: "Report language",
    consent: "I agree to Varel processing this request and contacting me by email.",
    permission: "I confirm that I own this website or have permission to request this analysis.",
    scanning: "Scanning the homepage… reading HTML, robots.txt, schema and content.",
    overall: "Overall LLM Readiness",
    topIssues: "Top issues to fix",
    requestDetailed: "Request detailed report for 20 €",
    disclaimer:
      "This report does not guarantee visibility, ranking or citation in ChatGPT, Google AI Search, Perplexity, Claude, Gemini or any other AI/search system. The report analyzes technical accessibility, content clarity, structure and AI search readiness based on publicly available website data.",
    requestReceived: "Your request has been received. We will review it and send you an offer by email.",
    scores: {
      overall: "Overall LLM Readiness",
      technicalCrawlability: "Technical Crawlability",
      contentExtractability: "Content Extractability",
      schemaReadiness: "Schema Readiness",
      crawlerPolicy: "AI Crawler Policy",
      visualConsistency: "Visual Consistency",
    },
  },
  hr: {
    h1: "LLM Visibility Scanner",
    subtitle:
      "Provjeri koliko je tvoj web spreman za ChatGPT Search, Google AI Search, Perplexity, Claude-style search asistente i moderne AI answer engine sustave.",
    heroBody:
      "Provjeri koliko je tvoj web spreman za AI search i moderne answer engine sustave. Varel analizira što crawleri i AI/search sustavi mogu pročitati: HTML, rendered content, meta podatke, schema markup, AI crawler policy, jasnoću sadržaja, strukturu entiteta, answer blokove i vizualnu konzistentnost.",
    runScan: "Pokreni besplatni scan",
    detailedCta: "Zatraži detaljan izvještaj za 20 €",
    freeNote: "Besplatni osnovni scan zahtijeva email. Detaljni izvještaj dostupan je za 20 €.",
    urlLabel: "URL web stranice",
    emailLabel: "Email",
    langLabel: "Jezik izvještaja",
    consent: "Slažem se da Varel obradi ovaj zahtjev i kontaktira me putem emaila.",
    permission: "Potvrđujem da sam vlasnik ove web stranice ili imam dopuštenje zatražiti ovu analizu.",
    scanning: "Skeniram naslovnicu… čitam HTML, robots.txt, schemu i sadržaj.",
    overall: "Ukupna LLM spremnost",
    topIssues: "Najvažniji problemi za popraviti",
    requestDetailed: "Zatraži detaljan izvještaj za 20 €",
    disclaimer:
      "Ovaj izvještaj ne garantira vidljivost, rangiranje ili citiranje u ChatGPT-u, Google AI Searchu, Perplexityju, Claudeu, Geminiju ili bilo kojem drugom AI/search sustavu. Izvještaj analizira tehničku dostupnost, jasnoću sadržaja, strukturu i spremnost za AI search na temelju javno dostupnih podataka web stranice.",
    requestReceived: "Tvoj zahtjev je zaprimljen. Pregledat ćemo ga i poslati ponudu na email.",
    scores: {
      overall: "Ukupna LLM spremnost",
      technicalCrawlability: "Tehnička crawlability",
      contentExtractability: "Izvučivost sadržaja",
      schemaReadiness: "Schema spremnost",
      crawlerPolicy: "AI crawler policy",
      visualConsistency: "Vizualna konzistentnost",
    },
  },
} satisfies Record<Lang, Record<string, unknown>>;

/** Premade issue templates (EN/HR) keyed by id — no AI-generated text. */
export const ISSUE_TEXT: Record<string, { en: string; hr: string }> = {
  no_title: { en: "The homepage is missing a clear <title> tag.", hr: "Naslovnica nema jasan <title> tag." },
  no_meta_description: { en: "No meta description — AI/search systems have no summary snippet.", hr: "Nema meta description — AI/search sustavi nemaju sažetak." },
  no_h1: { en: "No H1 heading, so the main topic is unclear to crawlers.", hr: "Nema H1 naslova pa je glavna tema nejasna crawlerima." },
  multiple_h1: { en: "Multiple H1 headings dilute the page's main topic.", hr: "Više H1 naslova razvodnjava glavnu temu stranice." },
  thin_content: { en: "Very little readable text — AI has almost nothing to extract.", hr: "Vrlo malo čitljivog teksta — AI gotovo nema što izvući." },
  no_schema: { en: "No JSON-LD structured data (schema) was found.", hr: "Nije pronađen JSON-LD strukturirani podatak (schema)." },
  no_org_schema: { en: "No Organization/LocalBusiness schema to define your entity.", hr: "Nema Organization/LocalBusiness scheme za definiranje entiteta." },
  no_faq: { en: "No FAQ block — a strong signal for answer engines.", hr: "Nema FAQ bloka — snažnog signala za answer engine sustave." },
  fluff: { en: "Generic AI-fluff marketing phrases reduce clarity for AI.", hr: "Generičke marketinške fraze smanjuju jasnoću za AI." },
  no_robots: { en: "No robots.txt found — crawler rules are undefined.", hr: "Nije pronađen robots.txt — pravila za crawlere nisu definirana." },
  ai_bots_blocked: { en: "One or more AI search crawlers are blocked in robots.txt.", hr: "Jedan ili više AI search crawlera je blokiran u robots.txt." },
  no_sitemap: { en: "No sitemap.xml reference — harder for crawlers to discover pages.", hr: "Nema reference na sitemap.xml — teže otkrivanje stranica." },
  images_no_alt: { en: "Images without alt text can't be understood by crawlers.", hr: "Slike bez alt teksta crawleri ne razumiju." },
  no_canonical: { en: "No canonical URL — risk of duplicate-content confusion.", hr: "Nema canonical URL-a — rizik od zabune s dupliciranim sadržajem." },
  weak_answer_blocks: { en: "No clear direct-answer or summary block near the top.", hr: "Nema jasnog direktnog odgovora ili sažetka pri vrhu." },
  noindex: { en: "The homepage is set to noindex and won't be indexed.", hr: "Naslovnica je postavljena na noindex i neće biti indeksirana." },
  no_theme_color: { en: "No theme/brand color signals in the markup.", hr: "Nema signala o brand boji u markupu." },
};
