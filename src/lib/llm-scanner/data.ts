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

/** Which report module each issue belongs to. */
export const ISSUE_MODULE: Record<string, string> = {
  noindex: "Technical crawlability",
  no_title: "Metadata",
  no_meta_description: "Metadata",
  no_h1: "Content clarity",
  multiple_h1: "Content clarity",
  thin_content: "Content clarity",
  no_schema: "Schema & metadata",
  no_org_schema: "Entity & ontology",
  no_faq: "Answer blocks",
  fluff: "Content clarity",
  no_robots: "AI crawler policy",
  ai_bots_blocked: "AI crawler policy",
  no_sitemap: "Technical crawlability",
  images_no_alt: "Image & media",
  no_canonical: "Technical crawlability",
  weak_answer_blocks: "Answer blocks",
  no_theme_color: "Visual & brand",
};

type FixMeta = { fix: { en: string; hr: string }; why: { en: string; hr: string }; impact: "high" | "medium" | "low"; difficulty: "easy" | "medium" | "hard" };

/** Premade fix recommendations per issue id (no AI-generated text). */
export const FIX_TEMPLATES: Record<string, FixMeta> = {
  noindex: { fix: { en: "Remove the noindex directive so search/AI crawlers can index this page.", hr: "Ukloni noindex direktivu kako bi search/AI crawleri mogli indeksirati stranicu." }, why: { en: "A noindexed page cannot appear in search or be cited by AI answer engines.", hr: "Noindex stranica ne može se pojaviti u searchu niti biti citirana od AI sustava." }, impact: "high", difficulty: "easy" },
  no_title: { fix: { en: "Add a unique, descriptive <title> tag (about 40–60 characters).", hr: "Dodaj jedinstven, opisni <title> tag (oko 40–60 znakova)." }, why: { en: "The title is the primary label AI/search systems use to understand the page.", hr: "Title je glavna oznaka koju AI/search sustavi koriste za razumijevanje stranice." }, impact: "high", difficulty: "easy" },
  no_meta_description: { fix: { en: "Add a meta description (50–160 chars) that summarizes the page.", hr: "Dodaj meta description (50–160 znakova) koji sažima stranicu." }, why: { en: "It provides a ready-made summary snippet for search and AI answers.", hr: "Daje gotov sažetak za search i AI odgovore." }, impact: "medium", difficulty: "easy" },
  no_h1: { fix: { en: "Add a single clear H1 that states the page's main topic.", hr: "Dodaj jedan jasan H1 koji navodi glavnu temu stranice." }, why: { en: "The H1 signals the primary subject to crawlers and readers.", hr: "H1 signalizira glavnu temu crawlerima i čitateljima." }, impact: "high", difficulty: "easy" },
  multiple_h1: { fix: { en: "Keep one H1 and demote the rest to H2/H3.", hr: "Zadrži jedan H1, a ostale prebaci u H2/H3." }, why: { en: "Multiple H1s blur what the page is primarily about.", hr: "Više H1 razvodnjava o čemu je stranica." }, impact: "low", difficulty: "easy" },
  thin_content: { fix: { en: "Expand the page with clear, specific, useful text and examples.", hr: "Proširi stranicu jasnim, konkretnim i korisnim tekstom te primjerima." }, why: { en: "AI/search systems need extractable text to understand and cite a page.", hr: "AI/search sustavi trebaju tekst koji mogu izvući da razumiju i citiraju stranicu." }, impact: "high", difficulty: "medium" },
  no_schema: { fix: { en: "Add JSON-LD structured data (start with Organization + WebSite).", hr: "Dodaj JSON-LD strukturirane podatke (počni s Organization + WebSite)." }, why: { en: "Schema makes your entity and content machine-readable.", hr: "Schema čini tvoj entitet i sadržaj strojno čitljivim." }, impact: "high", difficulty: "medium" },
  no_org_schema: { fix: { en: "Add Organization (or LocalBusiness) schema with name, logo, url and sameAs.", hr: "Dodaj Organization (ili LocalBusiness) schemu s name, logo, url i sameAs." }, why: { en: "It defines your business as a clear entity for AI/search systems.", hr: "Definira tvoju tvrtku kao jasan entitet za AI/search sustave." }, impact: "medium", difficulty: "medium" },
  no_faq: { fix: { en: "Add an FAQ section with real questions and concise answers (+ FAQPage schema).", hr: "Dodaj FAQ sekciju s pravim pitanjima i sažetim odgovorima (+ FAQPage schema)." }, why: { en: "FAQs are highly quotable by answer engines.", hr: "FAQ-ovi su vrlo pogodni za citiranje od answer engine sustava." }, impact: "medium", difficulty: "easy" },
  fluff: { fix: { en: "Replace generic marketing phrases with concrete, specific statements.", hr: "Zamijeni generičke marketinške fraze konkretnim, specifičnim tvrdnjama." }, why: { en: "Vague copy is hard for AI to summarize accurately.", hr: "Nejasan tekst AI teško točno sažima." }, impact: "low", difficulty: "medium" },
  no_robots: { fix: { en: "Add a robots.txt that references your sitemap and sets crawler rules.", hr: "Dodaj robots.txt koji referencira sitemap i postavlja pravila za crawlere." }, why: { en: "It gives crawlers clear guidance and discoverability.", hr: "Daje crawlerima jasne upute i lakše otkrivanje." }, impact: "medium", difficulty: "easy" },
  ai_bots_blocked: { fix: { en: "Allow AI search crawlers (e.g. OAI-SearchBot, PerplexityBot) if you want AI search visibility; separate this from training bots.", hr: "Dopusti AI search crawlere (npr. OAI-SearchBot, PerplexityBot) ako želiš AI search vidljivost; odvoji to od training botova." }, why: { en: "Blocking search crawlers removes you from AI search answers.", hr: "Blokiranje search crawlera uklanja te iz AI search odgovora." }, impact: "high", difficulty: "easy" },
  no_sitemap: { fix: { en: "Publish a sitemap.xml and reference it in robots.txt.", hr: "Objavi sitemap.xml i referenciraj ga u robots.txt." }, why: { en: "It helps crawlers discover all your important pages.", hr: "Pomaže crawlerima otkriti sve važne stranice." }, impact: "low", difficulty: "easy" },
  images_no_alt: { fix: { en: "Add descriptive alt text to meaningful images.", hr: "Dodaj opisni alt tekst važnim slikama." }, why: { en: "Crawlers can't interpret image content without alt text.", hr: "Crawleri ne razumiju sadržaj slike bez alt teksta." }, impact: "medium", difficulty: "easy" },
  no_canonical: { fix: { en: "Add a self-referencing canonical URL.", hr: "Dodaj canonical URL koji pokazuje na samu stranicu." }, why: { en: "It prevents duplicate-content confusion.", hr: "Sprječava zabunu s dupliciranim sadržajem." }, impact: "low", difficulty: "easy" },
  weak_answer_blocks: { fix: { en: "Add a direct-answer paragraph near the top that states what/who/why in 1–2 sentences.", hr: "Dodaj paragraf s direktnim odgovorom pri vrhu koji u 1–2 rečenice kaže što/tko/zašto." }, why: { en: "Answer engines prefer pages that answer the query directly and early.", hr: "Answer engine sustavi preferiraju stranice koje odmah i izravno odgovaraju na upit." }, impact: "high", difficulty: "medium" },
  no_theme_color: { fix: { en: "Add a theme-color meta tag and consistent brand colors in CSS.", hr: "Dodaj theme-color meta tag i konzistentne brand boje u CSS." }, why: { en: "Consistent brand signals help visual consistency scoring.", hr: "Konzistentni brand signali pomažu ocjeni vizualne konzistentnosti." }, impact: "low", difficulty: "easy" },
};

/** Premade site-summary text by overall score band (EN/HR). */
export const SUMMARY_BAND: { min: number; en: string; hr: string }[] = [
  { min: 80, en: "This site is largely AI-search ready. Crawlers can access and understand the content well; the fixes below are mostly refinements.", hr: "Ova stranica je uglavnom spremna za AI search. Crawleri dobro pristupaju i razumiju sadržaj; popravci ispod su uglavnom fini detalji." },
  { min: 60, en: "This site has a solid foundation but several gaps reduce how clearly AI/search systems can read, understand and cite it. The prioritized fixes below will make the biggest difference.", hr: "Stranica ima solidnu osnovu, ali nekoliko praznina smanjuje koliko je AI/search sustavi jasno čitaju, razumiju i citiraju. Prioritetni popravci ispod donose najveću razliku." },
  { min: 40, en: "This site has meaningful AI-readiness gaps. Content clarity, structured data and answer blocks need work before AI/search systems can reliably interpret and cite it.", hr: "Stranica ima značajne praznine u spremnosti za AI. Jasnoća sadržaja, strukturirani podaci i answer blokovi trebaju rad prije nego što ih AI/search sustavi mogu pouzdano interpretirati i citirati." },
  { min: 0, en: "This site is currently hard for AI/search systems to read and understand. Start with the critical fixes below — crawlability, a clear entity definition, and extractable, direct content.", hr: "Ovu stranicu AI/search sustavi trenutno teško čitaju i razumiju. Kreni s kritičnim popravcima ispod — crawlability, jasna definicija entiteta te izvučiv, direktan sadržaj." },
];

/* ---- Rendered-DOM (Playwright) issue text, modules and fixes ---- */
export const RENDER_ISSUE_TEXT: Record<string, { en: string; hr: string }> = {
  js_dependency_critical: { en: "Static HTML has very little content; most of the page appears only after JavaScript renders.", hr: "Statički HTML ima vrlo malo sadržaja; većina stranice se pojavljuje tek nakon JavaScript renderiranja." },
  js_dependency_high: { en: "The page depends heavily on JavaScript for its main content.", hr: "Stranica se snažno oslanja na JavaScript za glavni sadržaj." },
  render_blocked: { en: "The page could not be rendered by a headless browser (possible bot protection or timeout).", hr: "Stranicu nije bilo moguće renderirati headless preglednikom (moguća bot zaštita ili timeout)." },
  poor_contrast: { en: "Some important text or CTA elements have weak color contrast.", hr: "Neki važni tekst ili CTA elementi imaju slab kontrast boja." },
};

Object.assign(ISSUE_MODULE, {
  js_dependency_critical: "Static HTML vs Rendered DOM",
  js_dependency_high: "Static HTML vs Rendered DOM",
  render_blocked: "Rendered DOM",
  poor_contrast: "Visual & brand",
});

Object.assign(FIX_TEMPLATES, {
  js_dependency_critical: {
    fix: { en: "Move the H1, direct-answer block, primary service/product descriptions, FAQ and important internal links into server-rendered or statically generated HTML.", hr: "Premjesti H1, direktan odgovor, glavne opise usluga/proizvoda, FAQ i važne interne linkove u server-rendered ili statički generiran HTML." },
    why: { en: "Some AI/search crawlers may see a much weaker version of the page if important content is not in static HTML.", hr: "Neki AI/search crawleri mogu vidjeti puno slabiju verziju stranice ako važan sadržaj nije u statičkom HTML-u." },
    impact: "high", difficulty: "hard",
  },
  js_dependency_high: {
    fix: { en: "Ensure the primary content, headings and answer blocks are present in server-rendered HTML, not only after client JavaScript.", hr: "Osiguraj da su glavni sadržaj, naslovi i answer blokovi prisutni u server-rendered HTML-u, a ne tek nakon client JavaScripta." },
    why: { en: "Server-rendered content is the most reliable for crawler and AI/search extraction.", hr: "Server-rendered sadržaj je najpouzdaniji za crawler i AI/search izvlačenje." },
    impact: "medium", difficulty: "medium",
  },
  render_blocked: {
    fix: { en: "Review bot protection, firewall rules and robots.txt so legitimate crawlers can access public content.", hr: "Pregledaj bot zaštitu, firewall pravila i robots.txt kako bi legitimni crawleri mogli pristupiti javnom sadržaju." },
    why: { en: "If browser-based crawlers cannot render the page, AI/search systems may struggle to extract full content.", hr: "Ako browser-based crawleri ne mogu renderirati stranicu, AI/search sustavi mogu imati poteškoća s izvlačenjem sadržaja." },
    impact: "high", difficulty: "medium",
  },
  poor_contrast: {
    fix: { en: "Increase contrast between text and background, especially for buttons, links and hero sections.", hr: "Povećaj kontrast između teksta i pozadine, posebno za gumbe, linkove i hero sekcije." },
    why: { en: "Poor contrast reduces readability and weakens the visual hierarchy of the page.", hr: "Slab kontrast smanjuje čitljivost i slabi vizualnu hijerarhiju stranice." },
    impact: "medium", difficulty: "easy",
  },
});
