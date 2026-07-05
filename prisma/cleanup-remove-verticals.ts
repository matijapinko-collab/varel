/**
 * One-off cleanup for the Finance + Gadget Reviews removal pivot.
 *
 * Removes ONLY the finance/gadget-review demo records and rebuilds the header
 * navigation without the Gadget Reviews and Finance dropdowns. General
 * Best Deals infrastructure (partners/offers/deals that are not the demo
 * samples) and AI/software categories are left untouched.
 *
 * Run: npx tsx prisma/cleanup-remove-verticals.ts
 * Idempotent.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const GADGET_SLUGS = [
  "gadget-reviews",
  "smart-home",
  "kitchen-appliances",
  "coffee-machines",
  "robot-vacuums",
  "air-purifiers",
  "air-conditioners",
  "tvs",
  "audio",
  "phones-tablets",
  "computers-accessories",
  "home-appliances",
];

// New top-level nav (Gadget Reviews + Finance removed), per locale.
//     Home / AI Tools / Best Deals / Buying Guides / Comparisons / Blog / About Us
const NAV_LABELS: Record<string, string[]> = {
  en: ["Home", "AI Tools", "Best Deals", "Buying Guides", "Comparisons", "Blog", "About Us"],
  hr: ["Početna", "AI alati", "Najbolje ponude", "Vodiči za kupnju", "Usporedbe", "Blog", "O nama"],
  de: ["Startseite", "KI-Tools", "Beste Angebote", "Kaufberatung", "Vergleiche", "Blog", "Über uns"],
  fr: ["Accueil", "Outils IA", "Meilleures offres", "Guides d'achat", "Comparatifs", "Blog", "À propos"],
  it: ["Home", "Strumenti IA", "Migliori offerte", "Guide all'acquisto", "Confronti", "Blog", "Chi siamo"],
  es: ["Inicio", "Herramientas IA", "Mejores ofertas", "Guías de compra", "Comparativas", "Blog", "Sobre nosotros"],
  zh: ["首页", "AI 工具", "最优惠", "购买指南", "对比", "博客", "关于我们"],
  hi: ["होम", "एआई टूल्स", "बेस्ट डील्स", "खरीद गाइड", "तुलना", "ब्लॉग", "हमारे बारे में"],
};

async function main() {
  console.log("Removing Finance + Gadget Reviews demo records…");
  const languages = await db.language.findMany({
    where: { isEnabled: true },
    orderBy: { position: "asc" },
  });

  // --- 1. Rebuild HEADER navigation without Gadget Reviews / Finance ---
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
      { label: labels[2], url: `/${loc}/best-deals` },
      { label: labels[3], url: `/${loc}/guides` },
      { label: labels[4], url: `/${loc}/compare` },
      { label: labels[5], url: `/${loc}/editorial` },
      { label: labels[6], url: `/${loc}/about` },
    ];
    let p = 0;
    for (const item of top) {
      await db.menuItem.create({
        data: { menuId: menu.id, label: item.label, url: item.url, position: p++ },
      });
    }
  }
  console.log(`  header nav rebuilt for: ${languages.map((l) => l.code).join(", ")}`);

  // --- 2. Remove sample demo Best Deals records (gadget-related) ---
  const sampleTool = await db.tool.findUnique({ where: { slug: "sample-robot-vacuum" } });
  const sampleDealTr = await db.dealTranslation.findFirst({
    where: { slug: "sample-robot-vacuum-deal" },
  });
  if (sampleDealTr) {
    const dealId = sampleDealTr.dealId;
    await db.dealTranslation.deleteMany({ where: { dealId } });
    await db.deal.deleteMany({ where: { id: dealId } });
    console.log("  removed sample featured deal");
  }
  await db.priceHistory.deleteMany({ where: { offerId: { in: ["seed-offer-1", "seed-offer-2"] } } });
  await db.productOffer.deleteMany({ where: { id: { in: ["seed-offer-1", "seed-offer-2"] } } });
  if (sampleTool) {
    await db.toolCategory.deleteMany({ where: { toolId: sampleTool.id } });
    await db.toolTranslation.deleteMany({ where: { toolId: sampleTool.id } });
    await db.tool.deleteMany({ where: { id: sampleTool.id } });
    console.log("  removed sample gadget product");
  }
  await db.affiliatePartner.deleteMany({
    where: { slug: { in: ["sample-partner", "sample-partner-two"] } },
  });

  // --- 3. Remove Gadget Reviews category tree ---
  const gadgetCats = await db.category.findMany({
    where: { slug: { in: GADGET_SLUGS } },
    select: { id: true },
  });
  const gadgetCatIds = gadgetCats.map((c) => c.id);
  if (gadgetCatIds.length) {
    // Detach any remaining tools from these categories, then delete.
    await db.toolCategory.deleteMany({ where: { categoryId: { in: gadgetCatIds } } });
    await db.categoryTranslation.deleteMany({ where: { categoryId: { in: gadgetCatIds } } });
    // Null out any child parent links so deletes don't hit FK issues.
    await db.category.updateMany({
      where: { parentCategoryId: { in: gadgetCatIds } },
      data: { parentCategoryId: null },
    });
    await db.category.deleteMany({ where: { id: { in: gadgetCatIds } } });
    console.log(`  removed ${gadgetCatIds.length} gadget categories`);
  }

  // --- 4. Remove homepage Gadget Reviews tool_grid blocks ---
  const gadgetBlocks = await db.pageBlock.findMany({
    where: { type: "tool_grid" },
  });
  let removedBlocks = 0;
  for (const block of gadgetBlocks) {
    const settings = block.settingsJson as { categorySlug?: string } | null;
    if (settings?.categorySlug === "gadget-reviews") {
      await db.pageBlock.delete({ where: { id: block.id } });
      removedBlocks++;
    }
  }
  console.log(`  removed ${removedBlocks} homepage gadget tool_grid block(s)`);

  console.log("Finance + Gadget Reviews cleanup complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
