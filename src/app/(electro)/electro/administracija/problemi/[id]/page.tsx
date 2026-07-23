import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject } from "@/lib/electro/project-access";
import {
  ELECTRO_ISSUE_STATUS_LABELS,
  ELECTRO_ISSUE_TYPE_LABELS,
  canTransitionIssue,
} from "@/lib/electro/workflow";
import type { ElectroIssueStatus } from "@/generated/prisma/client";
import { ElectroIssueStatusChanger, ElectroIssueCommentForm } from "@/components/electro/work/issue-panels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const ALL: ElectroIssueStatus[] = [
  "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_INFORMATION", "WAITING_FOR_INVESTOR",
  "WAITING_FOR_MATERIAL", "RESOLVED", "VERIFIED", "CLOSED", "REJECTED",
];

export default async function ElectroIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const issue = await db.electroIssue.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { project: true, comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!issue) notFound();
  if (!(await loadAccessibleProject(ctx, issue.projectId))) notFound();

  const targets = ALL.filter((s) => s !== issue.status && canTransitionIssue(issue.status, s));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/problemi`} className="text-sm text-muted hover:text-foreground">← Problemi</Link>

      <section className={electroCardCls}>
        <h1 className="text-xl font-bold">{issue.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {ELECTRO_ISSUE_TYPE_LABELS[issue.type]} · {issue.project.code} · Status: <strong>{ELECTRO_ISSUE_STATUS_LABELS[issue.status]}</strong>
        </p>
        {issue.description && <p className="mt-2 text-sm">{issue.description}</p>}
        {issue.proposedSolution && <p className="mt-2 text-sm text-muted">Predloženo: {issue.proposedSolution}</p>}
        {issue.actualSolution && <p className="mt-1 text-sm text-muted">Rješenje: {issue.actualSolution}</p>}
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Status</h2>
        <ElectroIssueStatusChanger issueId={issue.id} targets={targets} />
        <p className="mt-2 text-xs text-muted">Za „Riješen” je obavezan opis rješenja; provjeru i zatvaranje obavlja voditelj ili inženjer.</p>
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Komentari</h2>
        <ul className="mb-3 space-y-1.5 text-sm">
          {issue.comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
              <span className="text-muted">{c.createdAt.toLocaleString("hr-HR")}: </span>{c.body}
            </li>
          ))}
          {issue.comments.length === 0 && <li className="text-muted">Nema komentara.</li>}
        </ul>
        <ElectroIssueCommentForm issueId={issue.id} />
      </section>
    </div>
  );
}
