"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser, requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt } from "@/lib/bisneyscrm/forms";
import { ensureAssessmentTemplates } from "@/lib/bisneyscrm/candidates/assessment-seed";
import { recommendationFromScore } from "@/lib/bisneyscrm/candidates/assessment-score";
import type { BisneysAssessmentRecommendation } from "@/generated/prisma/client";

const RECS = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"];

export async function seedAssessmentTemplates(): Promise<void> {
  const user = await requireBisneysSuperadmin();
  const res = await ensureAssessmentTemplates();
  await bisneysAudit({ userId: user.id, action: "assessment_templates_seeded", entityType: "assessment", after: { ...res } });
  revalidatePath("/bisneyscrm/assessments");
}

/** Submits a filled scorecard: computes total/max/normalized + recommendation. */
export async function submitAssessment(candidateId: string, templateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const template = await db.bisneysAssessmentTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { questions: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) redirect(`/bisneyscrm/candidates/${candidateId}`);

  let total = 0, max = 0, eliminated = false;
  const answers: { questionId: string; questionText: string; score: number; maxScore: number; comment: string | null; isEliminatory: boolean; eliminated: boolean }[] = [];
  for (const s of template!.sections) {
    for (const q of s.questions) {
      const raw = parseInt(str(form.get(`q_${q.id}`)) || "0", 10);
      const score = Math.max(0, Math.min(q.maxScore, isNaN(raw) ? 0 : raw));
      const qEliminated = q.isEliminatory && score === 0;
      if (qEliminated) eliminated = true;
      total += score * q.weight;
      max += q.maxScore * q.weight;
      answers.push({ questionId: q.id, questionText: q.text, score, maxScore: q.maxScore, comment: opt(form.get(`c_${q.id}`)), isEliminatory: q.isEliminatory, eliminated: qEliminated });
    }
  }
  const normalized = max > 0 ? Math.round((total / max) * 10 * 10) / 10 : 0;
  const recRaw = str(form.get("recommendation"));
  const recommendation = (RECS.includes(recRaw) ? recRaw : recommendationFromScore(normalized)) as BisneysAssessmentRecommendation;

  const assessment = await db.bisneysCandidateAssessment.create({
    data: {
      candidateId, templateId, kind: template!.kind, totalScore: total, maxScore: max, normalizedScore: normalized,
      recommendation, eliminated, note: opt(form.get("note")), byUserId: user.id,
      answers: { create: answers },
    },
  });
  await db.bisneysActivity.create({ data: { type: "CANDIDATE_UPDATED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, newValue: `${template!.kind === "QUESTIONNAIRE" ? "Upitnik" : "Intervju"}: ${normalized}/10` } });
  await bisneysAudit({ userId: user.id, action: "assessment_submitted", entityType: "candidate", entityId: candidateId, after: { kind: template!.kind, normalized, recommendation } });
  redirect(`/bisneyscrm/candidates/${candidateId}`);
}
