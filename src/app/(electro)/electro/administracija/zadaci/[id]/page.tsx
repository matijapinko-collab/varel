import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_TASK_STATUS_LABELS, canTransitionTask } from "@/lib/electro/workflow";
import type { ElectroTaskStatus } from "@/generated/prisma/client";
import { ElectroTaskStatusChanger, ElectroChecklist } from "@/components/electro/work/task-panels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const ALL: ElectroTaskStatus[] = [
  "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_MATERIAL", "BLOCKED",
  "WAITING_FOR_REVIEW", "CHANGES_REQUIRED", "COMPLETED", "CANCELLED",
];

export default async function ElectroTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const task = await db.electroTask.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { project: true, checklist: { orderBy: { sortOrder: "asc" } } },
  });
  if (!task) notFound();
  if (!(await loadAccessibleProject(ctx, task.projectId))) notFound();

  const isManager = canManageProjects(ctx);
  const isAssignee = task.assigneeUserId === ctx.user.id;
  const canAct = isManager || isAssignee;
  // COMPLETED is manager-only and only from review; the changer still lists it,
  // the action enforces it.
  const targets = ALL.filter((s) => s !== task.status && canTransitionTask(task.status, s));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/zadaci`} className="text-sm text-muted hover:text-foreground">← Zadaci</Link>

      <section className={electroCardCls}>
        <h1 className="text-xl font-bold">{task.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {task.project.code} · Status: <strong>{ELECTRO_TASK_STATUS_LABELS[task.status]}</strong>
        </p>
        {task.description && <p className="mt-2 text-sm">{task.description}</p>}
      </section>

      {canAct && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Status</h2>
          <ElectroTaskStatusChanger taskId={task.id} targets={targets} />
          <p className="mt-2 text-xs text-muted">Elektroinstalater postavlja „Čeka pregled”; završetak potvrđuje voditelj ili inženjer.</p>
        </section>
      )}

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Checklista</h2>
        <ElectroChecklist taskId={task.id} items={task.checklist} canEdit={isManager} />
      </section>
    </div>
  );
}
