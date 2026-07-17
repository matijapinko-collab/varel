/**
 * Pure, DB-free core of the candidate↔job match score (Faza 8/9). Kept
 * separate from match-score.ts (which does the DB fan-out) so the scoring
 * algorithm is unit-testable in isolation. Total = 100 across 6 factors.
 */

export type MatchFactor = { key: string; label: string; points: number; max: number; note: string };
export type MatchResult = { score: number; factors: MatchFactor[] };

export type JobLite = {
  professionId: string | null; location: string | null; salary: string | null;
  requirements: string | null; languages: string | null; description?: string | null;
};
export type CandidateLite = {
  primaryProfessionId: string | null;
  city: string | null;
  expectedSalaryMax: unknown; // Prisma Decimal | number | null
  availabilityStatus: string | null;
  relocationPreference: string | null;
  totalExperienceMonths: number | null;
  fieldWorkWilling: boolean;
  professionIds: string[];
};

/** Extracts the first plausible monetary figure from a free-text salary string. */
export function parseSalary(s: string | null): number | null {
  if (!s) return null;
  const m = s.replace(/\./g, "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

const contains = (hay: string | null | undefined, needle: string | null | undefined) =>
  !!hay && !!needle && hay.toLowerCase().includes(needle.toLowerCase());

export function computeJobMatch(candidate: CandidateLite, job: JobLite, relatedProfessionIds: Set<string>): MatchResult {
  const factors: MatchFactor[] = [];

  // 1. Profession (40) — exact primary > any listed > related > none.
  {
    const max = 40;
    let points = 0; let note = "Zanimanje ne odgovara";
    if (job.professionId && candidate.primaryProfessionId === job.professionId) { points = 40; note = "Primarno zanimanje točno odgovara"; }
    else if (job.professionId && candidate.professionIds.includes(job.professionId)) { points = 32; note = "Ima traženo zanimanje (nije primarno)"; }
    else if (candidate.professionIds.some((id) => relatedProfessionIds.has(id))) { points = 18; note = "Srodno zanimanje"; }
    else if (!job.professionId) { points = 12; note = "Posao nema definirano zanimanje"; }
    factors.push({ key: "profession", label: "Zanimanje", points, max, note });
  }

  // 2. Location (15) — same city, or willing to relocate.
  {
    const max = 15;
    let points = 0; let note = "Lokacija nepoznata / ne odgovara";
    if (contains(job.location, candidate.city) || contains(candidate.city, job.location)) { points = 15; note = "Ista lokacija"; }
    else if (candidate.relocationPreference && !["NO"].includes(candidate.relocationPreference)) { points = 9; note = "Spreman na selidbu"; }
    else if (!job.location) { points = 6; note = "Posao nema lokaciju"; }
    factors.push({ key: "location", label: "Lokacija", points, max, note });
  }

  // 3. Salary (15) — candidate expectation within job budget.
  {
    const max = 15;
    const jobSal = parseSalary(job.salary);
    const candSal = candidate.expectedSalaryMax != null ? Number(candidate.expectedSalaryMax) : null;
    let points = 0; let note = "Nema podatka o plaći";
    if (jobSal != null && candSal != null) {
      if (candSal <= jobSal) { points = 15; note = `Očekivanje ${candSal} ≤ budžet ${jobSal}`; }
      else if (candSal <= jobSal * 1.15) { points = 8; note = "Očekivanje malo iznad budžeta"; }
      else { points = 2; note = "Očekivanje znatno iznad budžeta"; }
    } else if (candSal == null) { points = 6; note = "Kandidat nema definirano očekivanje"; }
    factors.push({ key: "salary", label: "Plaća", points, max, note });
  }

  // 4. Availability (12).
  {
    const max = 12;
    let points = 4; let note = "Dostupnost nepoznata";
    if (candidate.availabilityStatus === "AVAILABLE_IMMEDIATELY") { points = 12; note = "Dostupan odmah"; }
    else if (candidate.availabilityStatus === "AVAILABLE_FROM") { points = 9; note = "Dostupan od datuma"; }
    else if (candidate.availabilityStatus === "EMPLOYED_OPEN") { points = 6; note = "Zaposlen, otvoren za ponude"; }
    else if (candidate.availabilityStatus === "EMPLOYED_NOT_LOOKING") { points = 2; note = "Zaposlen, ne traži"; }
    factors.push({ key: "availability", label: "Dostupnost", points, max, note });
  }

  // 5. Experience (10).
  {
    const max = 10;
    const mo = candidate.totalExperienceMonths ?? 0;
    let points = 0; let note = "Bez podatka o iskustvu";
    if (mo >= 60) { points = 10; note = "5+ godina iskustva"; }
    else if (mo >= 24) { points = 7; note = "2–5 godina iskustva"; }
    else if (mo > 0) { points = 4; note = "Do 2 godine iskustva"; }
    factors.push({ key: "experience", label: "Iskustvo", points, max, note });
  }

  // 6. Field work / requirements (8).
  {
    const max = 8;
    const needsField = contains(job.requirements, "teren") || contains(job.description, "teren");
    let points = 4; let note = "Nema posebnih zahtjeva terena";
    if (needsField) { points = candidate.fieldWorkWilling ? 8 : 0; note = candidate.fieldWorkWilling ? "Spreman na teren (traženo)" : "Traži se teren — nije spreman"; }
    factors.push({ key: "field", label: "Teren / zahtjevi", points, max, note });
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  return { score, factors };
}
