import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ONE-SHOT migration endpoint for the Finance + Gadget Reviews removal on
 * production (the Prisma Postgres integration injects DATABASE_URL only at
 * runtime, so this can't be run from a local CLI).
 *
 * Protected by CRON_SECRET (Bearer). Idempotent and non-destructive to real
 * content — it only:
 *   1. deletes finance SeoMetadata rows,
 *   2. drops the finance tables (if present),
 *   3. creates the price_checker_cache table (if missing),
 *   4. rebuilds the header nav without Finance/Gadget,
 *   5. removes the Gadget Reviews category tree + demo sample records.
 *
 * DELETE this route after running it once.
 */

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

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary: Record<string, unknown> = {};

  try {
    // 1. Delete finance SeoMetadata rows.
    summary.seoDeleted = await db.$executeRawUnsafe(
      `DELETE FROM "seo_metadata" WHERE "entityType"::text = ANY($1::text[])`,
      ["FINANCE_PLATFORM", "STOCK_ANALYSIS", "ETF_GUIDE"]
    );

    // 2. Drop finance tables (if present).
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "finance_platform_alternatives" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "etf_guides" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "stock_analyses" CASCADE`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "finance_platforms" CASCADE`);
    summary.financeTablesDropped = true;

    // 3. Create price_checker_cache (if missing) — matches the Prisma model.
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "price_checker_cache" (
        "id" TEXT PRIMARY KEY,
        "cacheKey" TEXT NOT NULL UNIQUE,
        "payload" JSONB NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "price_checker_cache_expiresAt_idx" ON "price_checker_cache" ("expiresAt")`
    );
    summary.cacheTableReady = true;

    // 4. Rebuild header nav (no Finance/Gadget) for all enabled languages.
    const languages = await db.language.findMany({
      where: { isEnabled: true },
      orderBy: { position: "asc" },
    });
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
    summary.navRebuiltFor = languages.map((l) => l.code);

    // 5. Remove sample demo Best Deals records (gadget-related).
    const sampleTool = await db.tool.findUnique({ where: { slug: "sample-robot-vacuum" } });
    const sampleDealTr = await db.dealTranslation.findFirst({
      where: { slug: "sample-robot-vacuum-deal" },
    });
    if (sampleDealTr) {
      await db.dealTranslation.deleteMany({ where: { dealId: sampleDealTr.dealId } });
      await db.deal.deleteMany({ where: { id: sampleDealTr.dealId } });
    }
    await db.priceHistory.deleteMany({ where: { offerId: { in: ["seed-offer-1", "seed-offer-2"] } } });
    await db.productOffer.deleteMany({ where: { id: { in: ["seed-offer-1", "seed-offer-2"] } } });
    if (sampleTool) {
      await db.toolCategory.deleteMany({ where: { toolId: sampleTool.id } });
      await db.toolTranslation.deleteMany({ where: { toolId: sampleTool.id } });
      await db.tool.deleteMany({ where: { id: sampleTool.id } });
    }
    await db.affiliatePartner.deleteMany({
      where: { slug: { in: ["sample-partner", "sample-partner-two"] } },
    });

    // 6. Remove Gadget Reviews category tree.
    const gadgetCats = await db.category.findMany({
      where: { slug: { in: GADGET_SLUGS } },
      select: { id: true },
    });
    const gadgetCatIds = gadgetCats.map((c) => c.id);
    if (gadgetCatIds.length) {
      await db.toolCategory.deleteMany({ where: { categoryId: { in: gadgetCatIds } } });
      await db.categoryTranslation.deleteMany({ where: { categoryId: { in: gadgetCatIds } } });
      await db.category.updateMany({
        where: { parentCategoryId: { in: gadgetCatIds } },
        data: { parentCategoryId: null },
      });
      await db.category.deleteMany({ where: { id: { in: gadgetCatIds } } });
    }
    summary.gadgetCategoriesRemoved = gadgetCatIds.length;

    // 7. Remove homepage Gadget Reviews tool_grid blocks.
    const gadgetBlocks = await db.pageBlock.findMany({ where: { type: "tool_grid" } });
    let removedBlocks = 0;
    for (const block of gadgetBlocks) {
      const settings = block.settingsJson as { categorySlug?: string } | null;
      if (settings?.categorySlug === "gadget-reviews") {
        await db.pageBlock.delete({ where: { id: block.id } });
        removedBlocks++;
      }
    }
    summary.homepageGadgetBlocksRemoved = removedBlocks;

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("[migrate-verticals] failed:", (e as Error).message);
    return NextResponse.json(
      { ok: false, error: (e as Error).message, summary },
      { status: 500 }
    );
  }
}
