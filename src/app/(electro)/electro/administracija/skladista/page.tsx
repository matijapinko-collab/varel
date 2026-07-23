import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { ELECTRO_WAREHOUSE_TYPE_LABELS } from "@/lib/electro/warehouse-labels";
import { ElectroCreateWarehouseForm } from "@/components/electro/materials/material-forms";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroWarehousesPage() {
  const ctx = await requireElectroContext();
  if (!ctx.roles.includes("ADMIN")) redirect(`${ELECTRO_APP_BASE}/403`);

  const warehouses = await db.electroWarehouse.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Skladišta</h1>
      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Novo skladište</h2>
        <ElectroCreateWarehouseForm />
      </section>
      <div className="space-y-2">
        {warehouses.map((w) => (
          <div key={w.id} className={`${electroCardCls} !p-4`}>
            <p className="font-bold">{w.code} · {w.name} {!w.isActive && <span className="text-xs text-muted">(neaktivno)</span>}</p>
            <p className="text-sm text-muted">{ELECTRO_WAREHOUSE_TYPE_LABELS[w.type]}{w.address && ` · ${w.address}`}</p>
          </div>
        ))}
        {warehouses.length === 0 && <p className="text-sm text-muted">Još nema skladišta.</p>}
      </div>
    </div>
  );
}
