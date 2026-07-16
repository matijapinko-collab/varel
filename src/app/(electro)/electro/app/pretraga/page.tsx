import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { electroCardCls, electroInputCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

/**
 * Global search (brief §59). Results respect permissions: projects are limited
 * to accessible ones; investors/materials are company-wide but only for roles
 * that may see them. Everything is scoped to the tenant.
 */
export default async function ElectroSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireElectroContext();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const canManage = canManageProjects(ctx);

  const projectIds = (await db.electroProject.findMany({ where: accessibleProjectsWhere(ctx), select: { id: true } })).map((p) => p.id);

  const [projects, items, investors] = query.length >= 2
    ? await Promise.all([
        db.electroProject.findMany({
          where: { id: { in: projectIds }, OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }] },
          take: 10,
        }),
        canManage
          ? db.electroItem.findMany({ where: { companyId: ctx.company.id, OR: [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }] }, take: 10 })
          : Promise.resolve([]),
        canManage
          ? db.electroInvestor.findMany({ where: { companyId: ctx.company.id, isArchived: false, name: { contains: query, mode: "insensitive" } }, take: 10 })
          : Promise.resolve([]),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Pretraga</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Pretraži projekte, materijale, investitore…" className={electroInputCls} autoFocus />
        <button type="submit" className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Traži</button>
      </form>

      {query.length >= 2 ? (
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 font-bold">Projekti ({projects.length})</h2>
            {projects.map((p) => (
              <Link key={p.id} href={`${ELECTRO_APP_BASE}/projekti/${p.id}`} className={`${electroCardCls} !p-3 mb-2 block hover:border-emerald-400`}>
                <span className="text-muted">{p.code}</span> · {p.name}
              </Link>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted">Nema rezultata.</p>}
          </section>
          {canManage && (
            <>
              <section>
                <h2 className="mb-2 font-bold">Materijali ({items.length})</h2>
                {items.map((i) => (
                  <Link key={i.id} href={`${ELECTRO_APP_BASE}/materijali/${i.id}`} className={`${electroCardCls} !p-3 mb-2 block hover:border-emerald-400`}>
                    <span className="text-muted">{i.sku}</span> · {i.name}
                  </Link>
                ))}
                {items.length === 0 && <p className="text-sm text-muted">Nema rezultata.</p>}
              </section>
              <section>
                <h2 className="mb-2 font-bold">Investitori ({investors.length})</h2>
                {investors.map((i) => (
                  <Link key={i.id} href={`${ELECTRO_APP_BASE}/investitori/${i.id}`} className={`${electroCardCls} !p-3 mb-2 block hover:border-emerald-400`}>
                    {i.name}
                  </Link>
                ))}
                {investors.length === 0 && <p className="text-sm text-muted">Nema rezultata.</p>}
              </section>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Unesite najmanje 2 znaka.</p>
      )}
    </div>
  );
}
