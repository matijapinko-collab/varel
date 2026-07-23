import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_TASK_STATUS_LABELS } from "@/lib/electro/workflow";
import { ElectroCreateTaskForm } from "@/components/electro/work/create-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroTasksPage() {
  const ctx = await requireElectroContext();
  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);

  // Electricians see their own tasks; managers see all on accessible projects.
  const isManager = canManageProjects(ctx);
  const tasks = await db.electroTask.findMany({
    where: {
      companyId: ctx.company.id,
      projectId: { in: projectIds },
      ...(isManager ? {} : { assigneeUserId: ctx.user.id }),
    },
    include: { project: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const users = isManager
    ? await db.electroUser.findMany({ where: { companyId: ctx.company.id, status: "ACTIVE" }, orderBy: { lastName: "asc" } })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Zadaci</h1>

      {isManager && projects.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Novi zadatak</h2>
          <ElectroCreateTaskForm
            projects={projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))}
            users={users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }))}
          />
        </section>
      )}

      <div className="space-y-2">
        {tasks.map((t) => (
          <Link key={t.id} href={`${ELECTRO_APP_BASE}/zadaci/${t.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">{t.title} <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{ELECTRO_TASK_STATUS_LABELS[t.status]}</span></p>
            <p className="mt-0.5 text-sm text-muted">{t.project.code}{t.dueDate && ` · rok ${t.dueDate.toLocaleDateString("hr-HR")}`}</p>
          </Link>
        ))}
        {tasks.length === 0 && <p className="text-sm text-muted">Nema zadataka.</p>}
      </div>
    </div>
  );
}
