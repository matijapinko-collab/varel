/**
 * Finance vertical seed: category tree, header nav with Finance dropdown,
 * Editorial Policy CMS page (EN/HR), footer links, and clearly-marked
 * [SAMPLE] finance platform + stock analysis. Idempotent.
 *
 * Run: npm run db:seed:finance
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// slug, EN, HR, icon
const FINANCE_SUBCATS: [string, string, string, string][] = [
  ["investing-apps", "Investing Apps", "Aplikacije za ulaganje", "📈"],
  ["trading-platforms", "Trading Platforms", "Trading platforme", "💹"],
  ["broker-reviews", "Broker Reviews", "Recenzije brokera", "🏦"],
  ["stock-analysis", "Stock Analysis", "Analize dionica", "📊"],
  ["etf-guides", "ETF Guides", "ETF vodiči", "🧺"],
  ["investment-guides", "Investment Guides", "Vodiči za ulaganje", "🎓"],
  ["portfolio-tools", "Portfolio Tools", "Alati za portfelj", "🗂️"],
  ["personal-finance-apps", "Personal Finance Apps", "Aplikacije za osobne financije", "💳"],
  ["budgeting-apps", "Budgeting Apps", "Aplikacije za budžetiranje", "🧮"],
  ["market-analysis-tools", "Market Analysis Tools", "Alati za analizu tržišta", "🔬"],
  ["financial-education", "Financial Education", "Financijska edukacija", "📚"],
  ["beginner-investing", "Beginner Investing", "Ulaganje za početnike", "🌱"],
  ["watchlists", "Watchlists", "Watchliste", "👀"],
];

const NAV_LABELS: Record<string, string[]> = {
  //     Home    AI Tools   Gadget Reviews   Finance    Best Deals   Buying Guides  Comparisons  Blog  About Us
  en: ["Home", "AI Tools", "Gadget Reviews", "Finance", "Best Deals", "Buying Guides", "Comparisons", "Blog", "About Us"],
  hr: ["Početna", "AI alati", "Recenzije uređaja", "Financije", "Najbolje ponude", "Vodiči za kupnju", "Usporedbe", "Blog", "O nama"],
  de: ["Startseite", "KI-Tools", "Gadget-Tests", "Finanzen", "Beste Angebote", "Kaufberatung", "Vergleiche", "Blog", "Über uns"],
  fr: ["Accueil", "Outils IA", "Tests Gadgets", "Finance", "Meilleures offres", "Guides d'achat", "Comparatifs", "Blog", "À propos"],
  it: ["Home", "Strumenti IA", "Recensioni Gadget", "Finanza", "Migliori offerte", "Guide all'acquisto", "Confronti", "Blog", "Chi siamo"],
  es: ["Inicio", "Herramientas IA", "Reseñas de Gadgets", "Finanzas", "Mejores ofertas", "Guías de compra", "Comparativas", "Blog", "Sobre nosotros"],
};

const GADGET_SUBCATS: [string, string, string][] = [
  ["smart-home", "Smart Home", "Pametni dom"],
  ["kitchen-appliances", "Kitchen Appliances", "Kuhinjski aparati"],
  ["coffee-machines", "Coffee Machines", "Aparati za kavu"],
  ["robot-vacuums", "Robot Vacuums", "Robotski usisavači"],
  ["air-purifiers", "Air Purifiers", "Pročišćivači zraka"],
  ["air-conditioners", "Air Conditioners", "Klima uređaji"],
  ["tvs", "TVs", "TV-i"],
  ["audio", "Audio", "Audio"],
  ["phones-tablets", "Phones & Tablets", "Telefoni i tableti"],
  ["computers-accessories", "Computers & Accessories", "Računala i dodaci"],
  ["home-appliances", "Home Appliances", "Kućanski uređaji"],
];

const FINANCE_DROPDOWN: [string, string, string][] = [
  // path-suffix, EN, HR
  ["", "All Finance", "Sve financije"],
  ["/investing-apps", "Investing Apps", "Aplikacije za ulaganje"],
  ["/trading-platforms", "Trading Platforms", "Trading platforme"],
  ["/brokers", "Broker Reviews", "Recenzije brokera"],
  ["/stock-analysis", "Stock Analysis", "Analize dionica"],
  ["/guides", "Investment Guides", "Vodiči za ulaganje"],
];

const EDITORIAL_POLICY_EN = `
<h2>Editorial Policy</h2>
<p><em>Last updated: July 4, 2026</em></p>
<h3>How we write reviews</h3>
<p>Varel reviews are researched and written editorially. We evaluate products, tools and platforms against consistent criteria (features, fees, usability, support, transparency) and publish both pros and cons. Ratings use a 0–5 scale with decimals and reflect our editorial judgement at the time of the review.</p>
<h3>How affiliate links work</h3>
<p>Some links on Varel are affiliate links: if you click one and sign up or make a purchase, we may earn a commission at no additional cost to you. <strong>Affiliate commissions never guarantee a positive review, a higher rating, or a better placement.</strong> Sponsored placements are always labelled.</p>
<h3>Finance content</h3>
<p>All finance content on Varel — including platform reviews, broker comparisons and stock analysis — is educational and informational. It is <strong>not</strong> financial, investment, tax or legal advice, and it is never a personalised recommendation. Investing involves risk, including the possible loss of capital. You are responsible for your own financial decisions; consider consulting a qualified financial adviser.</p>
<h3>Accuracy and freshness</h3>
<p>Prices, fees, features and platform conditions change. We show "last updated" and "last reviewed" dates and try to keep information accurate, but content can become outdated. Always verify the current conditions with the provider before making decisions.</p>
<h3>Contact</h3>
<p>Questions about this policy: <a href="mailto:matija@pinko.hr">matija@pinko.hr</a>.</p>
`;

const EDITORIAL_POLICY_HR = `
<h2>Uređivačka politika</h2>
<p><em>Zadnje ažurirano: 4. srpnja 2026.</em></p>
<h3>Kako pišemo recenzije</h3>
<p>Varel recenzije nastaju uredničkim istraživanjem. Proizvode, alate i platforme ocjenjujemo prema dosljednim kriterijima (funkcionalnosti, naknade, jednostavnost, podrška, transparentnost) i objavljujemo i prednosti i nedostatke. Ocjene koriste skalu 0–5 s decimalama i odražavaju naš urednički sud u trenutku recenzije.</p>
<h3>Kako funkcioniraju affiliate poveznice</h3>
<p>Neke poveznice na Varelu su affiliate poveznice: ako kliknete i registrirate se ili kupite, možemo zaraditi proviziju bez dodatnog troška za vas. <strong>Affiliate provizije nikada ne jamče pozitivnu recenziju, višu ocjenu ni bolju poziciju.</strong> Sponzorirani sadržaji uvijek su označeni.</p>
<h3>Financijski sadržaj</h3>
<p>Sav financijski sadržaj na Varelu — uključujući recenzije platformi, usporedbe brokera i analize dionica — edukativan je i informativan. <strong>Nije</strong> financijski, investicijski, porezni ni pravni savjet i nikada nije personalizirana preporuka. Ulaganje uključuje rizik, uključujući mogući gubitak kapitala. Za vlastite financijske odluke odgovorni ste sami; razmislite o savjetovanju s kvalificiranim financijskim savjetnikom.</p>
<h3>Točnost i ažurnost</h3>
<p>Cijene, naknade, funkcionalnosti i uvjeti platformi se mijenjaju. Prikazujemo datume "zadnje ažurirano" i "zadnje pregledano" i nastojimo održavati točnost, no sadržaj može zastarjeti. Uvijek provjerite aktualne uvjete kod pružatelja prije odluka.</p>
<h3>Kontakt</h3>
<p>Pitanja o ovoj politici: <a href="mailto:matija@pinko.hr">matija@pinko.hr</a>.</p>
`;

async function main() {
  console.log("Seeding Finance vertical…");
  const owner = await db.user.findFirst({ where: { username: "mpinko" } });
  const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
  const langByCode = new Map(languages.map((l) => [l.code, l.id]));

  const upsertCatTranslation = async (categoryId: string, code: string, name: string, slug: string) => {
    const languageId = langByCode.get(code);
    if (!languageId) return;
    await db.categoryTranslation.upsert({
      where: { categoryId_languageId: { categoryId, languageId } },
      create: { categoryId, languageId, name, slug },
      update: { name },
    });
  };

  // --- Finance parent category + subcategories ---
  let position = 200;
  const parent = await db.category.upsert({
    where: { slug: "finance" },
    create: { slug: "finance", icon: "💰", position: position++, isFeatured: true, status: "PUBLISHED" },
    update: { isFeatured: true, status: "PUBLISHED" },
  });
  await upsertCatTranslation(parent.id, "en", "Finance", "finance");
  await upsertCatTranslation(parent.id, "hr", "Financije", "finance");
  for (const [slug, en, hr, icon] of FINANCE_SUBCATS) {
    const cat = await db.category.upsert({
      where: { slug: `finance-${slug}` },
      create: { slug: `finance-${slug}`, icon, position: position++, parentCategoryId: parent.id, status: "PUBLISHED" },
      update: { parentCategoryId: parent.id, status: "PUBLISHED" },
    });
    await upsertCatTranslation(cat.id, "en", en, `finance-${slug}`);
    await upsertCatTranslation(cat.id, "hr", hr, `finance-${slug}`);
  }
  console.log(`  categories: finance + ${FINANCE_SUBCATS.length} subcategories`);

  // --- Header nav (rebuild with Finance dropdown between Gadgets and Best Deals) ---
  for (const lang of languages) {
    const labels = NAV_LABELS[lang.code] ?? NAV_LABELS.en;
    const loc = lang.code;
    const menu = await db.menu.upsert({
      where: { location_languageId: { location: "HEADER", languageId: lang.id } },
      create: { name: `HEADER (${loc})`, location: "HEADER", languageId: lang.id },
      update: {},
    });
    await db.menuItem.deleteMany({ where: { menuId: menu.id } });

    const top: { label: string; url: string; dropdown?: "gadgets" | "finance" }[] = [
      { label: labels[0], url: `/${loc}` },
      { label: labels[1], url: `/${loc}/tools?category=ai-tools` },
      { label: labels[2], url: `/${loc}/tools?category=gadget-reviews`, dropdown: "gadgets" },
      { label: labels[3], url: `/${loc}/finance`, dropdown: "finance" },
      { label: labels[4], url: `/${loc}/best-deals` },
      { label: labels[5], url: `/${loc}/guides` },
      { label: labels[6], url: `/${loc}/compare` },
      { label: labels[7], url: `/${loc}/editorial` },
      { label: labels[8], url: `/${loc}/about` },
    ];
    let p = 0;
    for (const item of top) {
      const created = await db.menuItem.create({
        data: { menuId: menu.id, label: item.label, url: item.url, position: p++ },
      });
      if (item.dropdown === "gadgets") {
        let cp = 0;
        await db.menuItem.create({
          data: {
            menuId: menu.id, parentItemId: created.id,
            label: loc === "hr" ? "Sve recenzije" : "All Gadget Reviews",
            url: `/${loc}/tools?category=gadget-reviews`, position: cp++,
          },
        });
        for (const [slug, en, hr] of GADGET_SUBCATS) {
          await db.menuItem.create({
            data: {
              menuId: menu.id, parentItemId: created.id,
              label: loc === "hr" ? hr : en,
              url: `/${loc}/tools?category=${slug}`, position: cp++,
            },
          });
        }
      }
      if (item.dropdown === "finance") {
        let cp = 0;
        for (const [suffix, en, hr] of FINANCE_DROPDOWN) {
          await db.menuItem.create({
            data: {
              menuId: menu.id, parentItemId: created.id,
              label: loc === "hr" ? hr : en,
              url: `/${loc}/finance${suffix}`, position: cp++,
            },
          });
        }
      }
    }
  }
  console.log(`  header nav rebuilt (Finance dropdown) for: ${languages.map((l) => l.code).join(", ")}`);

  // --- Editorial Policy page (EN/HR) + footer link ---
  for (const [code, title, body] of [
    ["en", "Editorial Policy", EDITORIAL_POLICY_EN],
    ["hr", "Uređivačka politika", EDITORIAL_POLICY_HR],
  ] as const) {
    const languageId = langByCode.get(code)!;
    const slug = "editorial-policy";
    let page = await db.page.findFirst({ where: { languageId, slug } });
    if (!page) {
      page = await db.page.create({
        data: {
          languageId, translationKey: "legal-editorial-policy", title, slug,
          template: "builder", status: "PUBLISHED", publishedAt: new Date(),
          createdById: owner?.id,
        },
      });
    } else {
      await db.page.update({ where: { id: page.id }, data: { title, status: "PUBLISHED" } });
    }
    await db.pageBlock.deleteMany({ where: { pageId: page.id } });
    await db.pageBlock.create({
      data: { pageId: page.id, position: 0, type: "rich_text", contentJson: { html: body } },
    });
  }
  // Footer: append Editorial Policy link if missing
  for (const lang of languages) {
    const footer = await db.menu.findUnique({
      where: { location_languageId: { location: "FOOTER", languageId: lang.id } },
      include: { items: true },
    });
    if (!footer) continue;
    const url = `/${lang.code}/editorial-policy`;
    if (!footer.items.some((i) => i.url === url)) {
      await db.menuItem.create({
        data: {
          menuId: footer.id,
          label: lang.code === "hr" ? "Uređivačka politika" : "Editorial Policy",
          url,
          position: footer.items.length,
        },
      });
    }
  }
  console.log("  editorial policy page + footer links");

  // --- Sample finance platform (clearly marked) ---
  await db.financePlatform.upsert({
    where: { slug: "sample-investing-app" },
    create: {
      name: "Sample Investing App",
      slug: "sample-investing-app",
      type: "INVESTING_APP",
      description: "[SAMPLE] Demo investing app review — replace with a real review in Admin → Finance Platforms.",
      companyName: "Sample Fintech Ltd",
      websiteUrl: "https://example.com",
      affiliateUrl: "https://example.com/?ref=varel-sample",
      supportedCountriesJson: ["EU", "UK"],
      supportedAssetsJson: ["Stocks", "ETFs", "Fractional shares"],
      minimumDeposit: "€1",
      feeSummary: "0% commission on stocks and ETFs; 0.15% FX conversion fee. [SAMPLE]",
      pricingModel: "Freemium",
      demoAccount: true,
      mobileApp: true,
      webPlatform: true,
      beginnerFriendly: true,
      ratingOverall: 4.3,
      ratingFees: 4.5,
      ratingEaseOfUse: 4.6,
      ratingFeatures: 4.0,
      ratingSupport: 3.9,
      ratingResearchTools: 3.8,
      prosJson: ["Very low fees", "Simple onboarding", "Fractional investing from €1"],
      consJson: ["Limited research tools", "It is only a sample review"],
      bestFor: "Beginners who want simple, low-cost ETF investing",
      whoShouldAvoid: "Active traders who need advanced charting and order types.",
      reviewContent: "<h2>Sample review</h2><p>[SAMPLE] Edit this full review in the admin. Explain onboarding, fees, usability, safety and who the app suits.</p>",
      faqJson: [
        { question: "Is this a real app?", answer: "No — this is sample data shipped with the seed." },
      ],
      status: "PUBLISHED",
      publishedAt: new Date(),
      lastReviewedAt: new Date(),
    },
    update: {},
  });

  // --- Sample stock analysis (clearly marked, educational tone) ---
  await db.stockAnalysis.upsert({
    where: { slug: "sample-company-analysis" },
    create: {
      companyName: "Sample Company Inc.",
      ticker: "SMPL",
      exchange: "NASDAQ",
      slug: "sample-company-analysis",
      sector: "Technology",
      industry: "Software",
      country: "US",
      thesisSummary:
        "[SAMPLE] Editorial example: a profitable software company with recurring revenue, presented as a long-term watchlist idea for educational purposes.",
      investmentIdeaType: "LONG_TERM_WATCHLIST",
      riskLevel: "MEDIUM",
      timeHorizon: "LONG_TERM",
      valuationOverview: "[SAMPLE] Discuss valuation multiples versus history and peers here.",
      growthOverview: "[SAMPLE] Discuss revenue and earnings growth trends here.",
      profitabilityOverview: "[SAMPLE] Discuss margins and cash flow here.",
      debtOverview: "[SAMPLE] Discuss balance-sheet strength here.",
      bullCaseJson: ["Recurring revenue model", "Strong cash generation", "Large addressable market"],
      bearCaseJson: ["Competition from larger platforms", "Valuation not cheap", "Execution risk"],
      keyRisksJson: ["Market downturns affect multiples", "Customer concentration", "This is sample data"],
      keyMetricsJson: [
        { label: "Revenue growth (5y avg)", value: "12% [SAMPLE]" },
        { label: "Gross margin", value: "78% [SAMPLE]" },
        { label: "Net debt", value: "None [SAMPLE]" },
      ],
      conclusion:
        "[SAMPLE] Editorial view: an interesting business for a long-term watchlist. Not a recommendation to buy, sell or hold.",
      sourcesJson: ["Company annual report (example)", "Public filings (example)"],
      authorId: owner?.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
      lastReviewedAt: new Date(),
    },
    update: {},
  });
  console.log("  sample finance platform + stock analysis");

  console.log("Finance seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
