import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, loadAccessibleProject } from "@/lib/electro/project-access";
import { ELECTRO_LOCATION_TYPE_LABELS } from "@/lib/electro/investor-labels";
import { ElectroPhotoUploadForm } from "@/components/electro/photos/photo-upload-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const ctx = await requireElectroContext();
  const { project: selectedId } = await searchParams;

  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  // The selected project (validated for access), for the uploader.
  const selected = selectedId ? await loadAccessibleProject(ctx, selectedId) : null;
  const [locations, phases] = selected
    ? await Promise.all([
        db.electroProjectLocation.findMany({ where: { projectId: selected.id }, orderBy: { name: "asc" } }),
        db.electroProjectPhase.findMany({ where: { projectId: selected.id }, orderBy: { sortOrder: "asc" } }),
      ])
    : [[], []];

  const projectIds = projects.map((p) => p.id);
  const photos = await db.electroPhoto.findMany({
    where: { companyId: ctx.company.id, projectId: { in: projectIds } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Fotografije</h1>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Dodaj fotografiju</h2>
        <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
          <div>
            <label htmlFor="project" className="mb-1 block text-sm font-medium">Projekt</label>
            <select id="project" name="project" defaultValue={selectedId ?? ""} className="rounded-lg border border-black/10 bg-background px-3 py-2 text-sm dark:border-white/10">
              <option value="">— odaberite —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </div>
          <button type="submit" className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">Odaberi</button>
        </form>
        {selected ? (
          <ElectroPhotoUploadForm
            projectId={selected.id}
            locations={locations.map((l) => ({ id: l.id, label: `${l.name} (${ELECTRO_LOCATION_TYPE_LABELS[l.type]})` }))}
            phases={phases.map((p) => ({ id: p.id, label: p.name }))}
          />
        ) : (
          <p className="text-sm text-muted">Odaberite projekt za dodavanje fotografije.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">Galerija</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted">Još nema fotografija.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((ph) => (
              <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt={ph.comment ?? ph.fileName} className="aspect-square w-full object-cover" />
                <div className="p-2 text-xs">
                  <p className="font-medium">{ph.project.code}</p>
                  <p className="truncate text-muted">{ph.category ?? ph.comment ?? ph.fileName}</p>
                  <p className="text-muted">{ph.createdAt.toLocaleDateString("hr-HR")}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted">
        <Link href={`${ELECTRO_APP_BASE}/projekti`} className="hover:underline">Projekti</Link> · fotografije su vezane uz projekt, lokaciju i fazu.
      </p>
    </div>
  );
}
