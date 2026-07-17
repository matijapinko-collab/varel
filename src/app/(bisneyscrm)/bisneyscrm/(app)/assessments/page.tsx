import { requireBisneysUser, getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { seedAssessmentTemplates } from "@/server/actions/bisneys-assessments";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard } from "@/components/bisneyscrm/shared/ui";
import { ASSESSMENT_KIND_LABELS } from "@/lib/bisneyscrm/candidates/labels";
import type { BisneysAssessmentKind } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  await requireBisneysUser();
  const user = await getBisneysUser();
  const isSuper = user?.role === "SUPERADMIN";

  const templates = await db.bisneysAssessmentTemplate.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { sections: { include: { _count: { select: { questions: true } } } } },
  });
  const byKind = new Map<BisneysAssessmentKind, typeof templates>();
  for (const t of templates) { (byKind.get(t.kind) ?? byKind.set(t.kind, []).get(t.kind)!).push(t); }

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Procjene (scorecard predlošci)" description="Upitnik i Intervju predlošci — općeniti i po zanimanju.">
        {isSuper && <form action={seedAssessmentTemplates}><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Seedaj predloške</button></form>}
      </BisneysPageHeader>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted">
          Nema predložaka. {isSuper ? "Kliknite Seedaj predloške za zadane Upitnik/Intervju scorecarde." : "Superadmin treba učitati predloške."}
        </div>
      ) : (
        <div className="space-y-4">
          {(["QUESTIONNAIRE", "INTERVIEW"] as BisneysAssessmentKind[]).map((kind) => {
            const list = byKind.get(kind) ?? [];
            if (!list.length) return null;
            return (
              <DetailCard key={kind} title={`${ASSESSMENT_KIND_LABELS[kind]} (${list.length})`}>
                <ul className="divide-y divide-border">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium">{t.name}{!t.isActive && <span className="ml-2 text-xs text-muted">(neaktivno)</span>}</span>
                      <span className="text-xs text-muted">{t.sections.reduce((n, s) => n + s._count.questions, 0)} pitanja</span>
                    </li>
                  ))}
                </ul>
              </DetailCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
