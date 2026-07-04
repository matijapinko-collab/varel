/**
 * Seeds the Gadget Reviews category tree, rebuilds the header navigation
 * (with the Gadget Reviews dropdown) for all enabled languages, and adds a
 * small set of clearly-marked [SAMPLE] Best Deals records (partner, product,
 * offers, price history, featured deal). Idempotent.
 *
 * Run: npm run db:seed:gadgets
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// slug, EN, HR, icon
const GADGET_SUBCATS: [string, string, string, string][] = [
  ["smart-home", "Smart Home", "Pametni dom", "🏠"],
  ["kitchen-appliances", "Kitchen Appliances", "Kuhinjski aparati", "🍽️"],
  ["coffee-machines", "Coffee Machines", "Aparati za kavu", "☕"],
  ["robot-vacuums", "Robot Vacuums", "Robotski usisavači", "🤖"],
  ["air-purifiers", "Air Purifiers", "Pročišćivači zraka", "🌬️"],
  ["air-conditioners", "Air Conditioners", "Klima uređaji", "❄️"],
  ["tvs", "TVs", "TV-i", "📺"],
  ["audio", "Audio", "Audio", "🎧"],
  ["phones-tablets", "Phones & Tablets", "Telefoni i tableti", "📱"],
  ["computers-accessories", "Computers & Accessories", "Računala i dodaci", "💻"],
  ["home-appliances", "Home Appliances", "Kućanski uređaji", "🧺"],
];

// Top-level nav labels per locale
const NAV_LABELS: Record<string, string[]> = {
  //        Home        AI Tools     Gadget Reviews      Best Deals        Buying Guides    Comparisons   Blog    About Us
  en: ["Home", "AI Tools", "Gadget Reviews", "Best Deals", "Buying Guides", "Comparisons", "Blog", "About Us"],
  hr: ["Početna", "AI alati", "Recenzije uređaja", "Najbolje ponude", "Vodiči za kupnju", "Usporedbe", "Blog", "O nama"],
  de: ["Startseite", "KI-Tools", "Gadget-Tests", "Beste Angebote", "Kaufberatung", "Vergleiche", "Blog", "Über uns"],
  fr: ["Accueil", "Outils IA", "Tests Gadgets", "Meilleures offres", "Guides d'achat", "Comparatifs", "Blog", "À propos"],
  it: ["Home", "Strumenti IA", "Recensioni Gadget", "Migliori offerte", "Guide all'acquisto", "Confronti", "Blog", "Chi siamo"],
  es: ["Inicio", "Herramientas IA", "Reseñas de Gadgets", "Mejores ofertas", "Guías de compra", "Comparativas", "Blog", "Sobre nosotros"],
};
const ALL_GADGETS_LABEL: Record<string, string> = {
  en: "All Gadget Reviews",
  hr: "Sve recenzije",
  de: "Alle Gadget-Tests",
  fr: "Tous les tests",
  it: "Tutte le recensioni",
  es: "Todas las reseñas",
};

async function main() {
  console.log("Seeding Gadget Reviews + Best Deals…");
  const owner = await db.user.findFirst({ where: { username: "mpinko" } });
  const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
  const langByCode = new Map(languages.map((l) => [l.code, l.id]));
  const enId = langByCode.get("en")!;
  const hrId = langByCode.get("hr")!;

  const upsertCatTranslation = async (categoryId: string, code: string, name: string, slug: string) => {
    const languageId = langByCode.get(code);
    if (!languageId) return;
    await db.categoryTranslation.upsert({
      where: { categoryId_languageId: { categoryId, languageId } },
      create: { categoryId, languageId, name, slug },
      update: { name },
    });
  };

  // --- Gadget Reviews parent category ---
  let position = 100;
  const parent = await db.category.upsert({
    where: { slug: "gadget-reviews" },
    create: { slug: "gadget-reviews", icon: "🔌", position: position++, isFeatured: true, status: "PUBLISHED" },
    update: { isFeatured: true, status: "PUBLISHED" },
  });
  await upsertCatTranslation(parent.id, "en", "Gadget Reviews", "gadget-reviews");
  await upsertCatTranslation(parent.id, "hr", "Recenzije uređaja", "gadget-reviews");

  // --- Subcategories ---
  const subIds: Record<string, string> = {};
  for (const [slug, en, hr, icon] of GADGET_SUBCATS) {
    const cat = await db.category.upsert({
      where: { slug },
      create: { slug, icon, position: position++, parentCategoryId: parent.id, status: "PUBLISHED" },
      update: { parentCategoryId: parent.id, status: "PUBLISHED" },
    });
    subIds[slug] = cat.id;
    await upsertCatTranslation(cat.id, "en", en, slug);
    await upsertCatTranslation(cat.id, "hr", hr, slug);
  }
  console.log(`  categories: gadget-reviews + ${GADGET_SUBCATS.length} subcategories`);

  // --- Header navigation with Gadget Reviews dropdown ---
  for (const lang of languages) {
    const labels = NAV_LABELS[lang.code] ?? NAV_LABELS.en;
    const loc = lang.code;
    const menu = await db.menu.upsert({
      where: { location_languageId: { location: "HEADER", languageId: lang.id } },
      create: { name: `HEADER (${loc})`, location: "HEADER", languageId: lang.id },
      update: {},
    });
    await db.menuItem.deleteMany({ where: { menuId: menu.id } });

    const top = [
      { label: labels[0], url: `/${loc}` },
      { label: labels[1], url: `/${loc}/tools?category=ai-tools` },
      { label: labels[2], url: `/${loc}/tools?category=gadget-reviews`, dropdown: true },
      { label: labels[3], url: `/${loc}/best-deals` },
      { label: labels[4], url: `/${loc}/guides` },
      { label: labels[5], url: `/${loc}/compare` },
      { label: labels[6], url: `/${loc}/editorial` },
      { label: labels[7], url: `/${loc}/about` },
    ];
    let p = 0;
    for (const item of top) {
      const created = await db.menuItem.create({
        data: { menuId: menu.id, label: item.label, url: item.url, position: p++ },
      });
      if (item.dropdown) {
        let cp = 0;
        // "All Gadget Reviews" first, then each subcategory
        await db.menuItem.create({
          data: {
            menuId: menu.id,
            parentItemId: created.id,
            label: ALL_GADGETS_LABEL[loc] ?? ALL_GADGETS_LABEL.en,
            url: `/${loc}/tools?category=gadget-reviews`,
            position: cp++,
          },
        });
        for (const [slug, en, hr] of GADGET_SUBCATS) {
          const label = loc === "hr" ? hr : en;
          await db.menuItem.create({
            data: {
              menuId: menu.id,
              parentItemId: created.id,
              label,
              url: `/${loc}/tools?category=${slug}`,
              position: cp++,
            },
          });
        }
      }
    }
  }
  console.log(`  header nav rebuilt for: ${languages.map((l) => l.code).join(", ")}`);

  // --- Sample affiliate partner + gadget product + offers + deal ---
  const partner = await db.affiliatePartner.upsert({
    where: { slug: "sample-partner" },
    create: {
      name: "Sample Partner",
      slug: "sample-partner",
      websiteUrl: "https://example.com",
      affiliateNetwork: "Direct",
      partnerType: "RETAILER",
      priority: 10,
      isActive: true,
      notes: "[SAMPLE] Demo affiliate partner — replace in Admin → Affiliate Partners.",
    },
    update: {},
  });
  const partner2 = await db.affiliatePartner.upsert({
    where: { slug: "sample-partner-two" },
    create: {
      name: "Sample Partner Two",
      slug: "sample-partner-two",
      websiteUrl: "https://example.com",
      affiliateNetwork: "Awin",
      partnerType: "NETWORK",
      priority: 5,
      isActive: true,
      notes: "[SAMPLE] Second demo partner.",
    },
    update: {},
  });

  // Sample gadget product (Tool) under gadget-reviews + robot-vacuums
  const gadget = await db.tool.upsert({
    where: { slug: "sample-robot-vacuum" },
    create: {
      name: "Sample Robot Vacuum X1",
      slug: "sample-robot-vacuum",
      websiteUrl: "https://example.com",
      pricingModel: "PAID",
      status: "PUBLISHED",
      editorRating: 4.4,
      publishedAt: new Date(),
      createdById: owner?.id,
    },
    update: {},
  });
  for (const catSlug of ["gadget-reviews", "robot-vacuums"]) {
    const catId = catSlug === "gadget-reviews" ? parent.id : subIds[catSlug];
    if (catId) {
      await db.toolCategory.upsert({
        where: { toolId_categoryId: { toolId: gadget.id, categoryId: catId } },
        create: { toolId: gadget.id, categoryId: catId },
        update: {},
      });
    }
  }
  for (const code of ["en", "hr"]) {
    await db.toolTranslation.upsert({
      where: { toolId_languageId: { toolId: gadget.id, languageId: langByCode.get(code)! } },
      create: {
        toolId: gadget.id,
        languageId: langByCode.get(code)!,
        name: "Sample Robot Vacuum X1",
        slug: "sample-robot-vacuum",
        shortDescription:
          code === "hr"
            ? "[PRIMJER] Demo robotski usisavač — zamijeni pravom recenzijom."
            : "[SAMPLE] Demo robot vacuum — replace with a real review.",
        longDescription:
          code === "hr"
            ? "<h2>Primjer recenzije</h2><p>Uredi u Admin → Tools.</p>"
            : "<h2>Sample review</h2><p>Edit in Admin → Tools.</p>",
        prosJson: ["Strong suction", "Good app", "Quiet"],
        consJson: ["It is only a sample"],
        status: "PUBLISHED",
      },
      update: {},
    });
  }

  // Two offers from different partners
  const offerSpecs = [
    { id: "seed-offer-1", partnerId: partner.id, merchant: "Sample Partner", price: 579, old: 699, shipping: 0, coupon: "SAVE20", avail: "IN_STOCK" as const },
    { id: "seed-offer-2", partnerId: partner2.id, merchant: "Sample Partner Two", price: 599, old: 699, shipping: 9.9, coupon: null, avail: "IN_STOCK" as const },
  ];
  let bestOfferId: string | null = null;
  for (const s of offerSpecs) {
    const offer = await db.productOffer.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        toolId: gadget.id,
        partnerId: s.partnerId,
        merchantName: s.merchant,
        productUrl: "https://example.com/product",
        affiliateUrl: "https://example.com/product?ref=varel-sample",
        currentPrice: s.price,
        oldPrice: s.old,
        currency: "EUR",
        couponCode: s.coupon,
        couponDescription: s.coupon ? "€20 off with code" : null,
        shippingCost: s.shipping,
        availability: s.avail,
        lastCheckedAt: new Date(),
        manuallyVerified: true,
        isActive: true,
      },
      update: {},
    });
    if (s.id === "seed-offer-1") bestOfferId = offer.id;
    // Price history point
    const existingHistory = await db.priceHistory.count({ where: { offerId: offer.id } });
    if (existingHistory === 0) {
      await db.priceHistory.create({
        data: {
          offerId: offer.id,
          toolId: gadget.id,
          partnerId: s.partnerId,
          price: s.price,
          oldPrice: s.old,
          currency: "EUR",
          availability: s.avail,
        },
      });
    }
  }

  // Featured best deal tied to the product + best offer + partner
  const existingDeal = await db.dealTranslation.findFirst({ where: { slug: "sample-robot-vacuum-deal" } });
  if (!existingDeal) {
    const deal = await db.deal.create({
      data: {
        brandName: "Sample Partner",
        productId: gadget.id,
        offerId: bestOfferId,
        partnerId: partner.id,
        oldPrice: 699,
        newPrice: 579,
        currency: "EUR",
        discountPercent: 17,
        isFeatured: true,
        status: "PUBLISHED",
        publishedAt: new Date(),
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
        validUntil: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    for (const code of ["en", "hr"]) {
      await db.dealTranslation.create({
        data: {
          dealId: deal.id,
          languageId: langByCode.get(code)!,
          title:
            code === "hr"
              ? "Sample Robot Vacuum X1 — najbolja partnerska cijena [PRIMJER]"
              : "Sample Robot Vacuum X1 — best partner price [SAMPLE]",
          slug: "sample-robot-vacuum-deal",
          description:
            code === "hr"
              ? "[PRIMJER] Najbolja dostupna ponuda kroz naše affiliate partnere."
              : "[SAMPLE] Best available offer through our affiliate partners.",
          ctaText: code === "hr" ? "Provjeri ponudu" : "Check deal",
          status: "PUBLISHED",
        },
      });
    }
    console.log("  sample featured deal created");
  }

  // --- Homepage sections: Gadget Reviews grid + Best Deals ---
  const homepages = await db.page.findMany({ where: { isHomepage: true, deletedAt: null }, include: { language: true } });
  for (const page of homepages) {
    const hasBestDeals = await db.pageBlock.count({ where: { pageId: page.id, type: "best_deals" } });
    if (hasBestDeals > 0) continue;
    const labels = NAV_LABELS[page.language.code] ?? NAV_LABELS.en;
    const catBlock = await db.pageBlock.findFirst({ where: { pageId: page.id, type: "category_grid" } });
    const insertAfter = catBlock?.position ?? 3;
    await db.pageBlock.updateMany({
      where: { pageId: page.id, position: { gt: insertAfter } },
      data: { position: { increment: 2 } },
    });
    await db.pageBlock.create({
      data: {
        pageId: page.id,
        type: "tool_grid",
        position: insertAfter + 1,
        contentJson: { title: labels[2] /* Gadget Reviews */ },
        settingsJson: { categorySlug: "gadget-reviews", limit: 8 },
      },
    });
    await db.pageBlock.create({
      data: {
        pageId: page.id,
        type: "best_deals",
        position: insertAfter + 2,
        contentJson: { title: labels[3] /* Best Deals */ },
        settingsJson: { limit: 6 },
      },
    });
  }
  console.log(`  homepage sections added for ${homepages.length} pages`);

  console.log("Gadget Reviews + Best Deals seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
