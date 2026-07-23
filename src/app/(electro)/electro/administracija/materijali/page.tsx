import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ElectroCreateItemForm } from "@/components/electro/materials/material-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroMaterialsPage() {
  const ctx = await requireElectroContext();
  const canManage = canManageProjects(ctx) || ctx.roles.includes("ADMIN");

  const items = await db.electroItem.findMany({
    where: { companyId: ctx.company.id, isActive: true },
    orderBy: { name: "asc" },
  });

  // Total balance per item across all warehouses (brief §40 — sum of movements).
  const balances = await db.electroStockMovement.groupBy({
    by: ["itemId"],
    where: { companyId: ctx.company.id },
    _sum: { qtyDelta: true },
  });
  const balanceMap = new Map(balances.map((b) => [b.itemId, Number(b._sum.qtyDelta ?? 0)]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Materijali</h1>

      {canManage && (
        <section className={electroCardCls}>
          <h2 className="mb-3 font-bold">Novi artikl</h2>
          <ElectroCreateItemForm />
        </section>
      )}

      <div className="space-y-2">
        {items.map((it) => {
          const bal = balanceMap.get(it.id) ?? 0;
          const low = it.minStock != null && bal < Number(it.minStock);
          return (
            <Link key={it.id} href={`${ELECTRO_APP_BASE}/materijali/${it.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
              <p className="font-bold">
                <span className="text-muted">{it.sku}</span> · {it.name}
                {low && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">Ispod minimuma</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Stanje: <strong className={low ? "text-red-600 dark:text-red-400" : "text-foreground"}>{bal} {it.unit}</strong>
                {it.minStock != null && ` · min ${it.minStock}`}
                {it.category && ` · ${it.category}`}
              </p>
            </Link>
          );
        })}
        {items.length === 0 && <p className="text-sm text-muted">Još nema artikala.</p>}
      </div>
    </div>
  );
}
