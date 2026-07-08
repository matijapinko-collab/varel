import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ONE-SHOT: rebuild the HEADER nav to add a "Varel Tools" dropdown
 * (AI Tool Finder + Varel Price Checker) in place of the standalone Best Deals
 * link. Protected by CRON_SECRET or a one-time token. Idempotent.
 * DELETE this route after running it once.
 */
const ONE_TIME_TOKEN = "4bcc8e112e3e736f3a32d47261c135424858e27b737e7b0c";

// Top-level labels: Home / AI Tools / Varel Tools / Buying Guides / Comparisons / Blog / About Us
const NAV_LABELS: Record<string, string[]> = {
  en: ["Home", "AI Tools", "Varel Tools", "Buying Guides", "Comparisons", "Blog", "About Us"],
  hr: ["Početna", "AI alati", "Varel alati", "Vodiči za kupnju", "Usporedbe", "Blog", "O nama"],
  de: ["Startseite", "KI-Tools", "Varel-Tools", "Kaufberatung", "Vergleiche", "Blog", "Über uns"],
  fr: ["Accueil", "Outils IA", "Outils Varel", "Guides d'achat", "Comparatifs", "Blog", "À propos"],
  it: ["Home", "Strumenti IA", "Strumenti Varel", "Guide all'acquisto", "Confronti", "Blog", "Chi siamo"],
  es: ["Inicio", "Herramientas IA", "Herramientas Varel", "Guías de compra", "Comparativas", "Blog", "Sobre nosotros"],
  zh: ["首页", "AI 工具", "Varel 工具", "购买指南", "对比", "博客", "关于我们"],
  hi: ["होम", "एआई टूल्स", "Varel टूल्स", "खरीद गाइड", "तुलना", "ब्लॉग", "हमारे बारे में"],
};
const FINDER_LABEL: Record<string, string> = {
  en: "AI Tool Finder", hr: "AI alat za pronalazak", de: "KI-Tool-Finder", fr: "Trouveur d'outils IA",
  it: "Ricerca strumenti IA", es: "Buscador de herramientas IA", zh: "AI 工具查找器", hi: "एआई टूल फाइंडर",
};
const CHECKER_LABEL: Record<string, string> = {
  en: "Varel Price Checker", hr: "Varel provjera cijena", de: "Varel Preis-Checker", fr: "Varel Comparateur de prix",
  it: "Varel Confronto prezzi", es: "Varel Comparador de precios", zh: "Varel 比价", hi: "Varel मूल्य जांच",
};

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const token = new URL(request.url).searchParams.get("token");
  if (!((secret && auth === `Bearer ${secret}`) || token === ONE_TIME_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
    for (const lang of languages) {
      const loc = lang.code;
      const labels = NAV_LABELS[loc] ?? NAV_LABELS.en;
      const menu = await db.menu.upsert({
        where: { location_languageId: { location: "HEADER", languageId: lang.id } },
        create: { name: `HEADER (${loc})`, location: "HEADER", languageId: lang.id },
        update: {},
      });
      await db.menuItem.deleteMany({ where: { menuId: menu.id } });

      const top = [
        { label: labels[0], url: `/${loc}` },
        { label: labels[1], url: `/${loc}/tools?category=ai-tools` },
        { label: labels[2], url: `/${loc}/ai-tool-finder`, dropdown: true },
        { label: labels[3], url: `/${loc}/guides` },
        { label: labels[4], url: `/${loc}/compare` },
        { label: labels[5], url: `/${loc}/editorial` },
        { label: labels[6], url: `/${loc}/about` },
      ];
      let p = 0;
      for (const item of top) {
        const created = await db.menuItem.create({
          data: { menuId: menu.id, label: item.label, url: item.url, position: p++ },
        });
        if (item.dropdown) {
          await db.menuItem.create({
            data: { menuId: menu.id, parentItemId: created.id, label: FINDER_LABEL[loc] ?? FINDER_LABEL.en, url: `/${loc}/ai-tool-finder`, position: 0 },
          });
          await db.menuItem.create({
            data: { menuId: menu.id, parentItemId: created.id, label: CHECKER_LABEL[loc] ?? CHECKER_LABEL.en, url: `/${loc}/best-deals`, position: 1 },
          });
        }
      }
    }
    return NextResponse.json({ ok: true, rebuiltFor: languages.map((l) => l.code) });
  } catch (e) {
    console.error("[migrate-varel-tools-nav] failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
