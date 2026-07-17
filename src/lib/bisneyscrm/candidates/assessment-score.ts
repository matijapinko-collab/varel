import "server-only";
import { db } from "@/lib/db";
import type { BisneysAssessmentRecommendation } from "@/generated/prisma/client";

/** Derive a recommendation band from a normalized 0–10 score. */
export function recommendationFromScore(normalized: number): BisneysAssessmentRecommendation {
  if (normalized >= 8) return "STRONG_YES";
  if (normalized >= 6.5) return "YES";
  if (normalized >= 4.5) return "MAYBE";
  if (normalized >= 2.5) return "NO";
  return "STRONG_NO";
}

export type AssessmentSummary = {
  questionnaire: { normalized: number | null; recommendation: BisneysAssessmentRecommendation | null; eliminated: boolean } | null;
  interview: { normalized: number | null; recommendation: BisneysAssessmentRecommendation | null; eliminated: boolean } | null;
};

/** Latest Upitnik + Intervju scores for a candidate (brief §21/§22). */
export async function candidateAssessmentSummary(candidateId: string): Promise<AssessmentSummary> {
  const [q, i] = await Promise.all([
    db.bisneysCandidateAssessment.findFirst({ where: { candidateId, kind: "QUESTIONNAIRE" }, orderBy: { createdAt: "desc" } }),
    db.bisneysCandidateAssessment.findFirst({ where: { candidateId, kind: "INTERVIEW" }, orderBy: { createdAt: "desc" } }),
  ]);
  const map = (a: typeof q) => a ? { normalized: a.normalizedScore ? Number(a.normalizedScore) : null, recommendation: a.recommendation, eliminated: a.eliminated } : null;
  return { questionnaire: map(q), interview: map(i) };
}
