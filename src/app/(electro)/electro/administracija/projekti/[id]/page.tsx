import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects, loadAccessibleProject } from "@/lib/electro/project-access";
import {
  ELECTRO_PROJECT_STATUS_LABELS,
  ELECTRO_PROJECT_PRIORITY_LABELS,
  canTransition,
} from "@/lib/electro/projects";
import type { ElectroProjectStatus } from "@/generated/prisma/client";
import { ElectroProjectForm } from "@/components/electro/projects/project-form";
import {
  ElectroProjectStatusChanger,
  ElectroProjectMembers,
  ElectroProjectPhases,
  ElectroProjectLocations,
} from "@/components/electro/projects/project-detail-panels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const ALL_STATUSES: ElectroProjectStatus[] = [
  "DRAFT", "OFFER", "APPROVED", "PREPARATION", "ACTIVE", "ON_HOLD",
  "WAITING_FOR_INVESTOR", "TECHNICAL_REVIEW", "COMPLETED", "CANCELLED", "ARCHIVED",
];

/** Flatten the location tree into depth-annotated rows for display. */
function flattenLocations(
  nodes: { id: string; name: string; type: string; parentId: string | null; sortOrder: number }[]
): { id: string; name: string; type: string; parentId: string | null; depth: number }[] {
  const byParent = new Map<string | null, typeof nodes>();
  for (const n of nodes) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n);
    byParent.set(n.parentId, arr);
  }
  const out: { id: string; name: string; type: string; parentId: string | null; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    for (const c of children) {
      out.push({ id: c.id, name: c.name, type: c.type, parentId: c.parentId, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default async function ElectroProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const accessible = await loadAccessibleProject(ctx, id);
  if (!accessible) notFound();

  // Full detail load (access already verified above).
  const project = await db.electroProject.findUnique({
    where: { id: accessible.id },
    include: {
      branch: true,
      investors: { include: { investor: true } },
      members: { include: { user: true } },
      phases: { orderBy: { sortOrder: "asc" } },
      locations: true,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!project) notFound();

  const canManage = canManageProjects(ctx);
  const [investors, branches, teamUsers] = canManage
    ? await Promise.all([
        db.electroInvestor.findMany({ where: { companyId: ctx.company.id, isArchived: false }, orderBy: { name: "asc" } }),
        db.electroBranch.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
        db.electroUser.findMany({ where: { companyId: ctx.company.id, status: "ACTIVE" }, orderBy: { lastName: "asc" } }),
      ])
    : [[], [], []];

  const allowedTargets = ALL_STATUSES.filter((s) => s !== project.status && canTransition(project.status, s));
  const locRows = flattenLocations(project.locations);

  return (
    <div className="space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/projekti`} className="text-sm text-muted hover:text-foreground">← Projekti</Link>

      <div className={electroCardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-muted">{project.code}</span> · {project.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Status: <strong>{ELECTRO_PROJECT_STATUS_LABELS[project.status]}</strong> · Prioritet: {ELECTRO_PROJECT_PRIORITY_LABELS[project.priority]} · {project.completionPercent}% dovršeno
            </p>
            {project.investors.length > 0 && (
              <p className="text-sm text-muted">
                Investitori: {project.investors.map((i) => i.investor.name).join(", ")}
              </p>
            )}
          </div>
        </div>
        {project.description && <p className="mt-3 text-sm">{project.description}</p>}
        {canManage && (
          <p className="mt-3">
            <Link href={`${ELECTRO_APP_BASE}/projekti/${project.id}/budzet`} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
              Budžet, troškovi i izvještaji →
            </Link>
          </p>
        )}
      </div>

      {canManage && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Promjena statusa</h2>
          <ElectroProjectStatusChanger projectId={project.id} allowedTargets={allowedTargets} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Faze</h2>
          {canManage ? (
            <ElectroProjectPhases projectId={project.id} phases={project.phases.map((p) => ({ id: p.id, name: p.name, status: p.status, progressPercent: p.progressPercent }))} />
          ) : (
            <ul className="space-y-1 text-sm">
              {project.phases.map((p) => <li key={p.id}>{p.name} — {p.progressPercent}%</li>)}
              {project.phases.length === 0 && <li className="text-muted">Još nema faza.</li>}
            </ul>
          )}
        </section>

        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Struktura lokacija</h2>
          {canManage ? (
            <ElectroProjectLocations projectId={project.id} locations={locRows} />
          ) : (
            <ul className="space-y-1 text-sm">
              {locRows.map((l) => <li key={l.id} style={{ marginLeft: l.depth * 16 }}>{l.name}</li>)}
              {locRows.length === 0 && <li className="text-muted">Još nema lokacija.</li>}
            </ul>
          )}
        </section>
      </div>

      {canManage && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Članovi tima</h2>
          <ElectroProjectMembers
            projectId={project.id}
            allUsers={teamUsers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
            memberIds={project.members.map((m) => m.userId)}
          />
        </section>
      )}

      {canManage && (
        <section className={electroCardCls}>
          <h2 className="mb-4 font-bold">Uredi projekt</h2>
          <ElectroProjectForm
            mode="edit"
            projectId={project.id}
            initial={{
              name: project.name,
              description: project.description ?? "",
              priority: project.priority,
              branchId: project.branchId ?? "",
              location: project.location ?? "",
              address: project.address ?? "",
              startDate: project.startDate?.toISOString().slice(0, 10) ?? "",
              contractDeadline: project.contractDeadline?.toISOString().slice(0, 10) ?? "",
              estimatedDeadline: project.estimatedDeadline?.toISOString().slice(0, 10) ?? "",
              contractValue: project.contractValue?.toString() ?? "",
              plannedBudget: project.plannedBudget?.toString() ?? "",
              completionPercent: project.completionPercent,
              delayReason: project.delayReason ?? "",
              investorIds: project.investors.map((i) => i.investorId),
              version: project.version,
            }}
            investors={investors.map((i) => ({ id: i.id, name: i.name }))}
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          />
        </section>
      )}

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Povijest statusa</h2>
        <ul className="space-y-1.5 text-sm">
          {project.statusHistory.map((h) => (
            <li key={h.id} className="text-muted">
              {h.createdAt.toLocaleString("hr-HR")} — {h.fromStatus ? `${ELECTRO_PROJECT_STATUS_LABELS[h.fromStatus]} → ` : ""}
              <strong className="text-foreground">{ELECTRO_PROJECT_STATUS_LABELS[h.toStatus]}</strong>
              {h.reason && ` · ${h.reason}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
