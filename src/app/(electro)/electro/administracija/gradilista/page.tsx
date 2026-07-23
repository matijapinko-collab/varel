import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere } from "@/lib/electro/project-access";
import { ELECTRO_PROJECT_STATUS_LABELS } from "@/lib/electro/projects";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

/**
 * Gradilišta (brief §12). This phase surfaces each accessible project's site
 * structure (its location roots) as the operational site view; a dedicated
 * ConstructionSite entity with its own CRUD is the next step. Reuses the
 * existing project + location data — no parallel model yet.
 */
export default async function ElectroSitesPage() {
  const ctx = await requireElectroContext();
  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    include: {
      locations: { where: { parentId: null }, orderBy: { sortOrder: "asc" } },
      _count: { select: { members: true, issues: { where: { status: { notIn: ["CLOSED", "VERIFIED", "REJECTED"] } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Gradilišta</h1>
        <p className="text-sm text-muted">Operativni pregled gradilišta po projektu. Zasebni modul gradilišta s vlastitim CRUD-om slijedi u sljedećoj fazi.</p>
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link key={p.id} href={`${ELECTRO_APP_BASE}/projekti/${p.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">
              <span className="text-muted">{p.code}</span> · {p.name}
              <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">{ELECTRO_PROJECT_STATUS_LABELS[p.status]}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {p.location ?? "Bez lokacije"} · {p.locations.length} objekata · {p._count.members} u timu · {p._count.issues} otvorenih problema
            </p>
            {p.locations.length > 0 && (
              <p className="mt-1 text-xs text-muted">{p.locations.map((l) => l.name).join(" · ")}</p>
            )}
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-muted">Još nema projekata s gradilištima.</p>}
      </div>
    </div>
  );
}
