import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_PROJECT_STATUS_LABELS, ELECTRO_PROJECT_PRIORITY_LABELS } from "@/lib/electro/projects";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  OFFER: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  APPROVED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  PREPARATION: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  ON_HOLD: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  WAITING_FOR_INVESTOR: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  TECHNICAL_REVIEW: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-300",
  ARCHIVED: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};

export default async function ElectroProjectsPage() {
  const ctx = await requireElectroContext();

  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    include: {
      investors: { include: { investor: true } },
      _count: { select: { phases: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Projekti</h1>
        {canManageProjects(ctx) && (
          <Link href={`${ELECTRO_APP_BASE}/projekti/novi`} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            + Novi projekt
          </Link>
        )}
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link key={p.id} href={`${ELECTRO_APP_BASE}/projekti/${p.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold">
                  <span className="text-muted">{p.code}</span> · {p.name}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>{ELECTRO_PROJECT_STATUS_LABELS[p.status]}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {[p.location, p.investors.map((i) => i.investor.name).join(", ")].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-muted">
                  Prioritet: {ELECTRO_PROJECT_PRIORITY_LABELS[p.priority]} · {p._count.phases} faza · {p._count.members} članova · {p.completionPercent}% dovršeno
                </p>
              </div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-muted">Još nema projekata.</p>}
      </div>
    </div>
  );
}
