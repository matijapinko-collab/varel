import "server-only";
import { db } from "@/lib/db";
import { candidateIdsForProfessions } from "@/lib/bisneyscrm/candidates/profession-search";
import { computeJobMatch, type JobLite, type CandidateLite, type MatchResult } from "@/lib/bisneyscrm/candidates/match-core";

export { computeJobMatch };
export type { MatchResult, MatchFactor } from "@/lib/bisneyscrm/candidates/match-core";

/**
 * Explainable candidate ↔ job match score (Faza 8). The scoring algorithm lives
 * in match-core.ts (pure, unit-tested); this module adds the DB fan-out that
 * builds the candidate pool and loads the fields the score needs.
 */

/** Ranks candidates for a job by match score (explainable). Pulls the pool via the profession alias engine, plus a small recent fallback. */
export async function matchingCandidatesForJob(jobId: string, limit = 20): Promise<{ candidateId: string; name: string; city: string | null; result: MatchResult }[]> {
  const job = await db.bisneysJob.findUnique({ where: { id: jobId } });
  if (!job) return [];

  // Related professions for relatedness scoring.
  const relatedIds = new Set<string>();
  if (job.professionId) {
    relatedIds.add(job.professionId);
    const rel = await db.bisneysRelatedProfession.findMany({
      where: { OR: [{ professionId: job.professionId }, { relatedProfessionId: job.professionId }] },
      select: { professionId: true, relatedProfessionId: true },
    });
    rel.forEach((r) => { relatedIds.add(r.professionId); relatedIds.add(r.relatedProfessionId); });
  }

  // Candidate pool: those with a related profession, plus recent actives as fallback.
  const poolIds = new Set<string>(await candidateIdsForProfessions([...relatedIds]));
  if (poolIds.size < limit) {
    const recent = await db.bisneysCandidate.findMany({
      where: { deletedAt: null }, orderBy: { lastActivityAt: "desc" }, take: limit * 2, select: { id: true },
    });
    recent.forEach((c) => poolIds.add(c.id));
  }
  if (poolIds.size === 0) return [];

  const candidates = await db.bisneysCandidate.findMany({
    where: { id: { in: [...poolIds] }, deletedAt: null },
    include: { person: { select: { fullName: true, city: true } }, professions: { select: { professionId: true } } },
  });

  const jobLite: JobLite & { description?: string | null } = {
    professionId: job.professionId, location: job.location, salary: job.salary, requirements: job.requirements, languages: job.languages, description: job.description,
  };

  const scored = candidates.map((c) => {
    const cand: CandidateLite = {
      primaryProfessionId: c.primaryProfessionId,
      city: c.person.city,
      expectedSalaryMax: c.expectedSalaryMax,
      availabilityStatus: c.availabilityStatus,
      relocationPreference: c.relocationPreference,
      totalExperienceMonths: c.totalExperienceMonths,
      fieldWorkWilling: c.fieldWorkWilling,
      professionIds: c.professions.map((p) => p.professionId),
    };
    return { candidateId: c.id, name: c.person.fullName, city: c.person.city, result: computeJobMatch(cand, jobLite, relatedIds) };
  });

  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.slice(0, limit);
}
