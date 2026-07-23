import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere } from "@/lib/electro/project-access";
import {
  ELECTRO_DOC_CATEGORY_LABELS,
  ELECTRO_DOC_STATUS_LABELS,
  ELECTRO_VISIBILITY_LABELS,
} from "@/lib/electro/documents";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CHANGES_REQUIRED: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
  DRAFT: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  UPLOADED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  SUPERSEDED: "bg-zinc-500/15 text-zinc-500",
  ARCHIVED: "bg-zinc-500/15 text-zinc-500",
};

export default async function ElectroDocumentsPage() {
  const ctx = await requireElectroContext();
  const accessibleProjects = await db.electroProject.findMany({
    where: accessibleProjectsWhere(ctx),
    select: { id: true },
  });
  const projectIds = accessibleProjects.map((p) => p.id);

  const documents = await db.electroDocument.findMany({
    where: { companyId: ctx.company.id, isArchived: false, projectId: { in: projectIds } },
    include: { project: true, currentVersion: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Dokumenti</h1>
        <Link href={`${ELECTRO_APP_BASE}/dokumenti/novi`} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          + Učitaj dokument
        </Link>
      </div>
      <div className="space-y-2">
        {documents.map((d) => (
          <Link key={d.id} href={`${ELECTRO_APP_BASE}/dokumenti/${d.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">
              {d.title}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[d.status]}`}>{ELECTRO_DOC_STATUS_LABELS[d.status]}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {ELECTRO_DOC_CATEGORY_LABELS[d.category]} · {d.project?.code} · {ELECTRO_VISIBILITY_LABELS[d.visibility]}
              {d.currentVersion && ` · v${d.currentVersion.versionLabel}`}
            </p>
          </Link>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted">Još nema dokumenata.</p>}
      </div>
    </div>
  );
}
