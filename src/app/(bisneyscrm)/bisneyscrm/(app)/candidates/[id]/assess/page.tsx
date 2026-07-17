import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { submitAssessment } from "@/server/actions/bisneys-assessments";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard } from "@/components/bisneyscrm/shared/ui";
import { ASSESSMENT_KIND_LABELS, ASSESSMENT_RECOMMENDATION_LABELS } from "@/lib/bisneyscrm/candidates/labels";
import type { BisneysAssessmentRecommendation } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const RECS: BisneysAssessmentRecommendation[] = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"];

export default async function AssessCandidate({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const { id } = await params;
  const sp = await searchParams;
  const templateId = typeof sp.templateId === "string" ? sp.templateId : "";

  const candidate = await db.bisneysCandidate.findFirst({ where: { id, deletedAt: null }, include: { person: { select: { fullName: true } } } });
  if (!candidate) notFound();

  // No template chosen → let the recruiter pick one.
  if (!templateId) {
    const templates = await db.bisneysAssessmentTemplate.findMany({ where: { isActive: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] });
    return (
      <div className="max-w-3xl">
        <BackLink href={`/bisneyscrm/candidates/${id}`}>{candidate.person.fullName}</BackLink>
        <BisneysPageHeader title="Nova procjena" description="Odaberite predložak (Upitnik ili Intervju)." />
        {templates.length === 0 ? <p className="text-sm text-muted">Nema predložaka. Superadmin ih učita na /bisneyscrm/assessments.</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <Link key={t.id} href={`/bisneyscrm/candidates/${id}/assess?templateId=${t.id}`} className="rounded-2xl border border-border bg-card p-4 hover:border-indigo-500/50">
                <div className="text-xs text-muted">{ASSESSMENT_KIND_LABELS[t.kind]}</div>
                <div className="mt-1 font-medium">{t.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const template = await db.bisneysAssessmentTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { questions: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) notFound();

  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/candidates/${id}`}>{candidate.person.fullName}</BackLink>
      <BisneysPageHeader title={template.name} description={`${ASSESSMENT_KIND_LABELS[template.kind]} · ocijenite 0–10 po pitanju`} />
      <form action={submitAssessment.bind(null, id, templateId)} className="space-y-4">
        {template.sections.map((s) => (
          <DetailCard key={s.id} title={s.title}>
            <ul className="space-y-3">
              {s.questions.map((q) => (
                <li key={q.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-sm">{q.text}{q.isEliminatory && <span className="ml-1 text-xs text-red-500">(eliminacijsko)</span>}</span>
                  <input name={`q_${q.id}`} type="number" min={0} max={q.maxScore} defaultValue={5} className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
                </li>
              ))}
            </ul>
          </DetailCard>
        ))}
        <DetailCard title="Zaključak">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-medium">Preporuka</span>
              <select name="recommendation" defaultValue="" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500">
                <option value="">Automatski iz rezultata</option>{RECS.map((r) => <option key={r} value={r}>{ASSESSMENT_RECOMMENDATION_LABELS[r]}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Bilješka</span>
              <input name="note" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </label>
          </div>
        </DetailCard>
        <button type="submit" className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Spremi procjenu</button>
      </form>
    </div>
  );
}
