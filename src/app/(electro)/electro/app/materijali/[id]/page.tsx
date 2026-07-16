import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_MOVEMENT_TYPE_LABELS } from "@/lib/electro/warehouse-labels";
import { ElectroPostMovementForm } from "@/components/electro/materials/material-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  const canManage = canManageProjects(ctx) || ctx.roles.includes("ADMIN");
  if (!canManage) redirect(`${ELECTRO_APP_BASE}/materijali`);
  const { id } = await params;

  const item = await db.electroItem.findFirst({ where: { id, companyId: ctx.company.id } });
  if (!item) notFound();

  const [warehouses, movements, perWarehouse] = await Promise.all([
    db.electroWarehouse.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { code: "asc" } }),
    db.electroStockMovement.findMany({ where: { companyId: ctx.company.id, itemId: item.id }, include: { warehouse: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.electroStockMovement.groupBy({ by: ["warehouseId"], where: { companyId: ctx.company.id, itemId: item.id }, _sum: { qtyDelta: true } }),
  ]);
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const total = perWarehouse.reduce((s, r) => s + Number(r._sum.qtyDelta ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/materijali`} className="text-sm text-muted hover:text-foreground">← Materijali</Link>

      <section className={electroCardCls}>
        <h1 className="text-xl font-bold"><span className="text-muted">{item.sku}</span> · {item.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Ukupno stanje: <strong className="text-foreground">{total} {item.unit}</strong>
          {item.minStock != null && ` · min ${item.minStock}`}
          {item.purchasePrice != null && ` · nab. ${item.purchasePrice} €`}
        </p>
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Stanje po skladištima</h2>
        <ul className="space-y-1 text-sm">
          {perWarehouse.map((r) => (
            <li key={r.warehouseId}>{whMap.get(r.warehouseId)?.code ?? "?"} · {whMap.get(r.warehouseId)?.name}: <strong>{Number(r._sum.qtyDelta ?? 0)} {item.unit}</strong></li>
          ))}
          {perWarehouse.length === 0 && <li className="text-muted">Nema pomaka.</li>}
        </ul>
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Proknjiži pomak</h2>
        {warehouses.length > 0 ? (
          <ElectroPostMovementForm itemId={item.id} warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} · ${w.name}` }))} />
        ) : (
          <p className="text-sm text-muted">Prvo dodajte skladište.</p>
        )}
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Knjiga pomaka</h2>
        <ul className="space-y-1 text-sm">
          {movements.map((m) => (
            <li key={m.id} className="flex justify-between gap-2 border-b border-black/5 py-1 last:border-0 dark:border-white/5">
              <span>{m.createdAt.toLocaleDateString("hr-HR")} · {ELECTRO_MOVEMENT_TYPE_LABELS[m.type]} · {m.warehouse.code}{m.reason && ` · ${m.reason}`}</span>
              <strong className={Number(m.qtyDelta) < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>{Number(m.qtyDelta) > 0 ? "+" : ""}{Number(m.qtyDelta)} {item.unit}</strong>
            </li>
          ))}
          {movements.length === 0 && <li className="text-muted">Nema pomaka.</li>}
        </ul>
      </section>
    </div>
  );
}
