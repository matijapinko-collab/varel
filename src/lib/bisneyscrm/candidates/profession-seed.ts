import "server-only";
import { db } from "@/lib/db";

/**
 * Seed catalogue of profession categories, professions, aliases and skills
 * (brief §8). Idempotent — upserts by name so re-running never duplicates.
 * Admin can later edit / deactivate. Aliases power the alias search engine (§9).
 */

type Prof = { name: string; aliases?: string[] };
type Cat = { name: string; slug: string; professions: Prof[]; skills: string[] };

export const PROFESSION_CATALOGUE: Cat[] = [
  {
    name: "Elektrotehnika", slug: "elektrotehnika",
    professions: [
      { name: "Električar" },
      { name: "Elektroinstalater" },
      { name: "Industrijski električar" },
      { name: "Električar održavanja", aliases: ["maintenance electrician", "elektro održavanje", "električar u održavanju"] },
      { name: "Elektromonter" },
      { name: "Serviser električne opreme" },
      { name: "Tehničar elektrotehnike" },
      { name: "Inženjer elektrotehnike" },
      { name: "Projektant elektroinstalacija", aliases: ["elektro projektant", "electrical designer", "projektant električnih instalacija"] },
      { name: "Voditelj elektro radova" },
      { name: "Inženjer puštanja u pogon", aliases: ["commissioning engineer", "commissioning inženjer", "inženjer za puštanje u rad"] },
      { name: "Data center engineer" },
    ],
    skills: ["čitanje elektro shema", "jaki i slabi napon", "industrijske instalacije", "elektro ormari", "mjerni instrumenti", "dijagnostika kvarova", "preventivno održavanje", "PLC osnove", "rad na visini", "puštanje sustava u rad", "rad u smjenama", "terenski rad"],
  },
  {
    name: "HVAC, klimatizacija i rashlada", slug: "hvac",
    professions: [
      { name: "Instalater klima", aliases: ["monter klime", "monter klimatizacije", "instalater klimatizacije"] },
      { name: "Monter klima" },
      { name: "Serviser klima" },
      { name: "HVAC serviser", aliases: ["serviser klima", "serviser klimatizacije", "tehničar za klime", "serviser rashladnih uređaja"] },
      { name: "HVAC tehničar" },
      { name: "Rashladni tehničar" },
      { name: "Monter ventilacije" },
      { name: "Serviser rashladnih sustava" },
      { name: "HVAC tehnički koordinator", aliases: ["tehnički koordinator klimatizacije", "HVAC coordinator"] },
      { name: "HVAC projektant" },
      { name: "Komercijalist za klimatizacijske uređaje" },
    ],
    skills: ["split sustavi", "multi-split", "VRF/VRV", "chillers", "dizalice topline", "ventilacija", "dijagnostika", "vakuumiranje", "punjenje sustava", "tvrdo lemljenje", "puštanje u pogon", "servis i održavanje", "F-gas certifikat", "rad s klijentima", "terenski rad", "B kategorija"],
  },
  {
    name: "Metal, montaža i strojarstvo", slug: "metal",
    professions: [
      { name: "Monter metalnih konstrukcija" },
      { name: "Pomoćni monter" },
      { name: "Monter plastenika" },
      { name: "Industrijski monter" },
      { name: "Bravar" },
      { name: "Zavarivač" },
      { name: "MIG/MAG zavarivač" },
      { name: "TIG zavarivač" },
      { name: "REL zavarivač" },
      { name: "Limar" },
      { name: "Krovopokrivač" },
      { name: "Strojarski tehničar" },
      { name: "Servisni tehničar" },
      { name: "CNC operater" },
      { name: "CNC programer" },
      { name: "Tokar" },
      { name: "Glodač" },
    ],
    skills: ["montaža metalnih konstrukcija", "montaža plastenika", "ručni i električni alat", "bravarski poslovi", "limarski poslovi", "krovopokrivački poslovi", "građevinsko iskustvo", "fizička spremnost", "višednevni teren", "rad u promjenjivim uvjetima", "samostalnost", "MIG/MAG zavarivanje", "TIG zavarivanje"],
  },
  {
    name: "Mehanika i vozila", slug: "mehanika",
    professions: [
      { name: "Mehaničar" },
      { name: "Automehaničar" },
      { name: "Autoserviser" },
      { name: "Dijagnostičar vozila" },
      { name: "Mehaničar teretnih vozila" },
      { name: "Mehaničar radnih strojeva" },
      { name: "Servisni savjetnik" },
      { name: "Vulkanizer" },
    ],
    skills: ["dijagnostika vozila", "mehanika motora", "kočioni sustavi", "ovjes", "elektrika vozila", "servisiranje", "dijagnostički alati", "putnička vozila", "teretna vozila", "radni strojevi"],
  },
  {
    name: "Građevina i instalacije", slug: "gradjevina",
    professions: [
      { name: "Vodoinstalater" },
      { name: "Instalater grijanja" },
      { name: "Monter cijevi" },
      { name: "Građevinski radnik" },
      { name: "Monter instalacija" },
      { name: "Voditelj gradilišta" },
      { name: "Poslovođa gradilišta" },
    ],
    skills: ["sanitarne instalacije", "grijanje", "cjevovodi", "tehnički nacrti", "rad na gradilištu", "terenski rad", "vođenje ekipe", "organizacija rada", "zaštita na radu"],
  },
  {
    name: "Tehničko projektiranje i inženjering", slug: "inzenjering",
    professions: [
      { name: "Projektni inženjer" },
      { name: "Tehnički koordinator" },
      { name: "Revit crtač" },
      { name: "BIM modelar" },
      { name: "CAD tehničar" },
      { name: "AutoCAD crtač" },
      { name: "Commissioning engineer" },
      { name: "Voditelj projekta" },
    ],
    skills: ["Revit", "AutoCAD", "BIM", "tehnička dokumentacija", "koordinacija izvođača", "rad s klijentima", "projektiranje", "izvedbeni projekti", "puštanje u pogon", "putovanja", "organizacija projekata"],
  },
  {
    name: "Računovodstvo i financije", slug: "racunovodstvo",
    professions: [
      { name: "Samostalni računovođa", aliases: ["samostalni knjigovođa", "independent accountant", "senior accountant"] },
      { name: "Voditelj računovodstva", aliases: ["glavni računovođa", "chief accountant", "accounting manager"] },
      { name: "Glavni računovođa" },
      { name: "Knjigovođa" },
      { name: "Financijski referent" },
      { name: "Obračun plaća" },
    ],
    skills: ["PDV", "obračun plaća", "završni račun", "financijski izvještaji", "knjiženje", "porezni propisi", "ERP sustavi", "vođenje tima", "komunikacija s klijentima"],
  },
  {
    name: "Prodaja i komercijala", slug: "prodaja",
    professions: [
      { name: "Komercijalist" },
      { name: "Komercijalist za klimatizacijske uređaje" },
      { name: "Komercijalist za keramičke pločice" },
      { name: "Terenski prodajni predstavnik" },
      { name: "Key Account Manager" },
      { name: "Prodajni predstavnik" },
      { name: "Tehnički komercijalist" },
    ],
    skills: ["B2B prodaja", "tehnička prodaja", "terenski rad", "akvizicija", "pregovaranje", "CRM", "prezentacija ponude", "vozačka dozvola", "prodajni targeti"],
  },
  {
    name: "Ostalo", slug: "ostalo",
    professions: [
      { name: "Sezonski radnik" },
      { name: "Radnik u proizvodnji" },
      { name: "Radnik u maloprodaji" },
      { name: "Content writer" },
    ],
    skills: [],
  },
];

/** Related professions (brief §9): srodna zanimanja beyond aliases. */
const RELATED: { profession: string; related: string; relation: string }[] = [
  { profession: "HVAC serviser", related: "Monter ventilacije", relation: "related" },
  { profession: "HVAC serviser", related: "Rashladni tehničar", relation: "related" },
  { profession: "HVAC serviser", related: "HVAC tehničar", relation: "related" },
  { profession: "Električar", related: "Elektromonter", relation: "related" },
  { profession: "Električar", related: "Elektroinstalater", relation: "related" },
  { profession: "Zavarivač", related: "MIG/MAG zavarivač", relation: "narrower" },
  { profession: "Zavarivač", related: "TIG zavarivač", relation: "narrower" },
];

export async function ensureProfessionCatalogue(): Promise<{ categories: number; professions: number; aliases: number; skills: number; related: number }> {
  let categories = 0, professions = 0, aliases = 0, skills = 0, related = 0;

  const profId = new Map<string, string>();
  for (const cat of PROFESSION_CATALOGUE) {
    const category = await db.bisneysProfessionCategory.upsert({
      where: { name: cat.name },
      create: { name: cat.name, slug: cat.slug, isActive: true },
      update: { slug: cat.slug },
    });
    categories++;

    for (const p of cat.professions) {
      const prof = await db.bisneysProfession.upsert({
        where: { name: p.name },
        create: { name: p.name, categoryId: category.id, isActive: true },
        update: { categoryId: category.id },
      });
      profId.set(p.name, prof.id);
      professions++;
      for (const a of p.aliases ?? []) {
        const exists = await db.bisneysProfessionAlias.findFirst({ where: { alias: { equals: a, mode: "insensitive" } } });
        if (!exists) { await db.bisneysProfessionAlias.create({ data: { professionId: prof.id, alias: a } }); aliases++; }
      }
    }

    for (const s of cat.skills) {
      await db.bisneysSkill.upsert({ where: { name: s }, create: { name: s, category: cat.slug, isActive: true }, update: { category: cat.slug } });
      skills++;
    }
  }

  for (const r of RELATED) {
    const pid = profId.get(r.profession), rid = profId.get(r.related);
    if (pid && rid) {
      const exists = await db.bisneysRelatedProfession.findFirst({ where: { professionId: pid, relatedProfessionId: rid, relation: r.relation } });
      if (!exists) { await db.bisneysRelatedProfession.create({ data: { professionId: pid, relatedProfessionId: rid, relation: r.relation } }); related++; }
    }
  }

  return { categories, professions, aliases, skills, related };
}
