import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import {
  ELECTRO_DOC_CATEGORY_LABELS,
  ELECTRO_DOC_STATUS_LABELS,
} from "@/lib/electro/documents";
import {
  ElectroNewVersionForm,
  ElectroApprovalPanel,
  ElectroVisibilityForm,
} from "@/components/electro/documents/document-panels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const doc = await db.electroDocument.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      project: true,
      currentVersion: true,
      versions: { orderBy: { createdAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!doc || !doc.projectId) notFound();
  // Enforce per-project access.
  if (!(await loadAccessibleProject(ctx, doc.projectId))) notFound();

  const canManage = canManageProjects(ctx);
  const awaitingDecision = doc.status === "UNDER_REVIEW";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/dokumenti`} className="text-sm text-muted hover:text-foreground">← Dokumenti</Link>

      <section className={electroCardCls}>
        <h1 className="text-xl font-bold">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {ELECTRO_DOC_CATEGORY_LABELS[doc.category]} · {doc.project?.code} · Status: <strong>{ELECTRO_DOC_STATUS_LABELS[doc.status]}</strong>
          {doc.requiresApproval && " · zahtijeva odobrenje inženjera"}
        </p>
        {doc.description && <p className="mt-2 text-sm">{doc.description}</p>}
        {doc.currentVersion && (
          <p className="mt-3">
            <a href={doc.currentVersion.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
              Preuzmi važeću verziju (v{doc.currentVersion.versionLabel})
            </a>
          </p>
        )}
      </section>

      {canManage && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Vidljivost</h2>
          <ElectroVisibilityForm documentId={doc.id} current={doc.visibility} />
        </section>
      )}

      {canManage && awaitingDecision && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Odluka o odobrenju</h2>
          <ElectroApprovalPanel documentId={doc.id} />
        </section>
      )}

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Verzije</h2>
        <ul className="space-y-1.5">
          {doc.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <span>
                <strong>v{v.versionLabel}</strong> · {ELECTRO_DOC_STATUS_LABELS[v.status]}
                {v.id === doc.currentVersionId && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(važeća)</span>}
                <span className="text-muted"> · {v.fileName} · {(v.sizeBytes / 1024).toFixed(0)} kB · {v.createdAt.toLocaleDateString("hr-HR")}</span>
                {v.changeNote && <span className="text-muted"> · {v.changeNote}</span>}
              </span>
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Preuzmi</a>
            </li>
          ))}
        </ul>
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Nova verzija</h2>
        <ElectroNewVersionForm documentId={doc.id} />
      </section>

      {doc.approvals.length > 0 && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Povijest odluka</h2>
          <ul className="space-y-1.5 text-sm text-muted">
            {doc.approvals.map((a) => (
              <li key={a.id}>
                {a.createdAt.toLocaleString("hr-HR")} — <strong className="text-foreground">{ELECTRO_DOC_STATUS_LABELS[a.decision]}</strong>
                {a.comment && ` · ${a.comment}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
