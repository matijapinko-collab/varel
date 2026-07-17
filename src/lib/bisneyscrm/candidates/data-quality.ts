import "server-only";
import { db } from "@/lib/db";

/**
 * Data-quality center (Faza 8). Scores per-candidate completeness and rolls up
 * database-wide quality signals: missing contact info, no profession, stale
 * records, low completeness, and possible duplicates.
 */

export type Completeness = { percent: number; missing: string[] };

type CandidateForQuality = {
  personEmail: string | null; personPhone: string | null; personCity: string | null;
  primaryProfessionId: string | null; availabilityStatus: string | null;
  educationLevel: string | null; totalExperienceMonths: number | null;
  expectedSalaryMax: unknown; candidateSource: string | null;
};

const CHECKS: { key: string; label: string; ok: (c: CandidateForQuality) => boolean }[] = [
  { key: "email", label: "Email", ok: (c) => !!c.personEmail },
  { key: "phone", label: "Telefon", ok: (c) => !!c.personPhone },
  { key: "city", label: "Grad", ok: (c) => !!c.personCity },
  { key: "profession", label: "Zanimanje", ok: (c) => !!c.primaryProfessionId },
  { key: "availability", label: "Dostupnost", ok: (c) => !!c.availabilityStatus },
  { key: "education", label: "Obrazovanje", ok: (c) => !!c.educationLevel },
  { key: "experience", label: "Iskustvo", ok: (c) => (c.totalExperienceMonths ?? 0) > 0 },
  { key: "salary", label: "Očekivana plaća", ok: (c) => c.expectedSalaryMax != null },
  { key: "source", label: "Izvor", ok: (c) => !!c.candidateSource },
];

export function candidateCompleteness(c: CandidateForQuality): Completeness {
  const missing = CHECKS.filter((chk) => !chk.ok(c)).map((chk) => chk.label);
  const percent = Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100);
  return { percent, missing };
}

export type QualityOverview = {
  total: number;
  missingContact: number;
  noProfession: number;
  lowCompleteness: number;
  stale: number;
  possibleDuplicates: number;
  buckets: { label: string; count: number }[];
  worst: { id: string; name: string; percent: number; missing: string[] }[];
};

export async function dataQualityOverview(): Promise<QualityOverview> {
  const staleCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const candidates = await db.bisneysCandidate.findMany({
    where: { deletedAt: null },
    select: {
      id: true, primaryProfessionId: true, availabilityStatus: true, educationLevel: true,
      totalExperienceMonths: true, expectedSalaryMax: true, candidateSource: true, possibleDuplicate: true, lastActivityAt: true,
      person: { select: { fullName: true, email: true, phone: true, city: true } },
    },
    take: 5000,
  });

  let missingContact = 0, noProfession = 0, lowCompleteness = 0, stale = 0, possibleDuplicates = 0;
  const buckets = [
    { label: "0–40%", count: 0 }, { label: "41–70%", count: 0 }, { label: "71–90%", count: 0 }, { label: "91–100%", count: 0 },
  ];
  const scored: { id: string; name: string; percent: number; missing: string[] }[] = [];

  for (const c of candidates) {
    const lite: CandidateForQuality = {
      personEmail: c.person.email, personPhone: c.person.phone, personCity: c.person.city,
      primaryProfessionId: c.primaryProfessionId, availabilityStatus: c.availabilityStatus,
      educationLevel: c.educationLevel, totalExperienceMonths: c.totalExperienceMonths,
      expectedSalaryMax: c.expectedSalaryMax, candidateSource: c.candidateSource,
    };
    const comp = candidateCompleteness(lite);
    scored.push({ id: c.id, name: c.person.fullName, percent: comp.percent, missing: comp.missing });

    if (!c.person.email && !c.person.phone) missingContact++;
    if (!c.primaryProfessionId) noProfession++;
    if (comp.percent < 50) lowCompleteness++;
    if (!c.lastActivityAt || c.lastActivityAt < staleCutoff) stale++;
    if (c.possibleDuplicate) possibleDuplicates++;

    if (comp.percent <= 40) buckets[0].count++;
    else if (comp.percent <= 70) buckets[1].count++;
    else if (comp.percent <= 90) buckets[2].count++;
    else buckets[3].count++;
  }

  scored.sort((a, b) => a.percent - b.percent);

  return {
    total: candidates.length, missingContact, noProfession, lowCompleteness, stale, possibleDuplicates,
    buckets, worst: scored.slice(0, 15),
  };
}
