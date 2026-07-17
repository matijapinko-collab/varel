import "server-only";
import { db } from "@/lib/db";
import type { BisneysAssessmentKind } from "@/generated/prisma/client";

/**
 * Default assessment templates (brief §21–23): one generic Upitnik
 * (questionnaire) and Intervju scorecards — a generic one plus profession-
 * specific ones (monter, HVAC serviser, inženjer elektrotehnike, računovođa).
 * Idempotent: a template is created only if none with the same name+kind exists.
 */

type Q = { text: string; eliminatory?: boolean };
type Tpl = { name: string; kind: BisneysAssessmentKind; professionName?: string; sections: { title: string; questions: Q[] }[] };

export const ASSESSMENT_TEMPLATES: Tpl[] = [
  {
    name: "Upitnik — općeniti", kind: "QUESTIONNAIRE",
    sections: [{
      title: "Osnovna procjena",
      questions: [
        { text: "Dostupnost" }, { text: "Motivacija" }, { text: "Relevantno iskustvo" },
        { text: "Očekivana plaća realna" }, { text: "Lokacija odgovara" }, { text: "Spremnost na selidbu" },
        { text: "Spremnost na terenski rad" }, { text: "Spremnost na smjenski rad" }, { text: "Vozačka dozvola" },
        { text: "Jezici" }, { text: "Dokumenti (CV, certifikati)" }, { text: "Otkazni rok prihvatljiv" },
      ],
    }],
  },
  {
    name: "Intervju — općeniti", kind: "INTERVIEW",
    sections: [{
      title: "Stručna procjena",
      questions: [
        { text: "Relevantno iskustvo" }, { text: "Praktično znanje" }, { text: "Tehnička razina" },
        { text: "Samostalnost" }, { text: "Komunikacija" }, { text: "Motivacija" }, { text: "Pouzdanost" },
        { text: "Stabilnost" }, { text: "Razumijevanje posla" }, { text: "Spremnost na uvjete rada" },
        { text: "Plaća i očekivanja" }, { text: "Lokacijski fit" }, { text: "Rizici" }, { text: "Ukupna preporuka" },
      ],
    }],
  },
  {
    name: "Intervju — monter metalnih konstrukcija", kind: "INTERVIEW", professionName: "Monter metalnih konstrukcija",
    sections: [{
      title: "Procjena montera",
      questions: [
        { text: "Iskustvo s montažom metalnih konstrukcija" }, { text: "Iskustvo s montažom plastenika" },
        { text: "Rad s ručnim i električnim alatom" }, { text: "Bravarski poslovi" }, { text: "Limarski / krovopokrivački poslovi" },
        { text: "Spremnost na višednevni teren", eliminatory: true }, { text: "Rad u promjenjivim vremenskim uvjetima" },
        { text: "Fizička spremnost" }, { text: "Praćenje uputa voditelja" }, { text: "Samostalnost" },
        { text: "Lokacija (Vrbovec i okolica)" }, { text: "Vlastiti prijevoz" }, { text: "Spremnost na rad izvan Hrvatske" },
      ],
    }],
  },
  {
    name: "Intervju — HVAC serviser", kind: "INTERVIEW", professionName: "HVAC serviser",
    sections: [{
      title: "Procjena HVAC servisera",
      questions: [
        { text: "Koje sustave servisira" }, { text: "F-gas certifikat", eliminatory: true }, { text: "Dijagnostika kvara" },
        { text: "Split, VRF i chilleri" }, { text: "Tvrdo lemljenje" }, { text: "Samostalno puštanje u rad" },
        { text: "Iskustvo s korisnicima" }, { text: "B kategorija" }, { text: "Spremnost na teren" },
      ],
    }],
  },
  {
    name: "Intervju — inženjer elektrotehnike", kind: "INTERVIEW", professionName: "Inženjer elektrotehnike",
    sections: [{
      title: "Procjena inženjera",
      questions: [
        { text: "Vrsta projekata" }, { text: "Revit / AutoCAD" }, { text: "Projektiranje elektroinstalacija" },
        { text: "Vođenje dokumentacije" }, { text: "Rad s klijentima" }, { text: "Koordinacija izvođača" },
        { text: "Commissioning" }, { text: "Putovanja" }, { text: "Engleski jezik" }, { text: "Razina odgovornosti" },
      ],
    }],
  },
  {
    name: "Intervju — samostalni računovođa", kind: "INTERVIEW", professionName: "Samostalni računovođa",
    sections: [{
      title: "Procjena računovođe",
      questions: [
        { text: "PDV" }, { text: "Obračun plaća" }, { text: "Završni računi" }, { text: "Financijski izvještaji" },
        { text: "Broj klijenata" }, { text: "ERP alati" }, { text: "Porezni propisi" }, { text: "Samostalnost" },
        { text: "Mogućnost razvoja u voditelja" },
      ],
    }],
  },
];

export async function ensureAssessmentTemplates(): Promise<{ created: number }> {
  let created = 0;
  for (const t of ASSESSMENT_TEMPLATES) {
    const exists = await db.bisneysAssessmentTemplate.findFirst({ where: { name: t.name, kind: t.kind } });
    if (exists) continue;
    const professionId = t.professionName
      ? (await db.bisneysProfession.findFirst({ where: { name: t.professionName }, select: { id: true } }))?.id ?? null
      : null;
    const tpl = await db.bisneysAssessmentTemplate.create({ data: { name: t.name, kind: t.kind, professionId, isSystem: true, isActive: true } });
    for (let si = 0; si < t.sections.length; si++) {
      const s = t.sections[si];
      const section = await db.bisneysAssessmentSection.create({ data: { templateId: tpl.id, title: s.title, sortOrder: si } });
      for (let qi = 0; qi < s.questions.length; qi++) {
        await db.bisneysAssessmentQuestion.create({ data: { sectionId: section.id, text: s.questions[qi].text, maxScore: 10, weight: 1, isEliminatory: !!s.questions[qi].eliminatory, sortOrder: qi } });
      }
    }
    created++;
  }
  return { created };
}
