"use client";

import { useActionState } from "react";
import {
  electroCreateWarehouse,
  electroCreateItem,
  electroPostMovement,
  type ElectroWarehouseResult,
} from "@/server/actions/electro-warehouses";
import {
  electroReportConsumption,
  electroConfirmConsumption,
  type ElectroConsumptionResult,
} from "@/server/actions/electro-consumption";
import { ELECTRO_WAREHOUSE_TYPE_LABELS, ELECTRO_MOVEMENT_TYPE_LABELS } from "@/lib/electro/warehouse-labels";
import type { ElectroWarehouseType, ElectroStockMovementType } from "@/generated/prisma/client";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Opt = { id: string; label: string };

export function ElectroCreateWarehouseForm() {
  const [state, action, pending] = useActionState<ElectroWarehouseResult, FormData>(
    (prev, form) => electroCreateWarehouse(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="code" placeholder="Šifra" required className={`${electroInputCls} !w-24`} aria-label="Šifra" />
      <input name="name" placeholder="Naziv" required className={`${electroInputCls} !w-44`} aria-label="Naziv" />
      <select name="type" className={`${electroInputCls} !w-40`} aria-label="Tip">
        {(Object.entries(ELECTRO_WAREHOUSE_TYPE_LABELS) as [ElectroWarehouseType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj skladište"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
      {state.ok && <p className={`${electroOkCls} w-full`}>Skladište je dodano.</p>}
    </form>
  );
}

export function ElectroCreateItemForm() {
  const [state, action, pending] = useActionState<ElectroWarehouseResult, FormData>(
    (prev, form) => electroCreateItem(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={electroLabelCls}>Šifra *</label><input name="sku" required className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Naziv *</label><input name="name" required className={electroInputCls} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div><label className={electroLabelCls}>Kategorija</label><input name="category" className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Jedinica</label><input name="unit" defaultValue="kom" className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Nab. cijena €</label><input name="purchasePrice" inputMode="decimal" className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Min. zaliha</label><input name="minStock" inputMode="decimal" className={electroInputCls} /></div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Artikl je dodan.</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj artikl"}</button>
    </form>
  );
}

export function ElectroPostMovementForm({ itemId, warehouses }: { itemId: string; warehouses: Opt[] }) {
  const [state, action, pending] = useActionState<ElectroWarehouseResult, FormData>(
    (prev, form) => electroPostMovement(prev, form),
    {}
  );
  const types: ElectroStockMovementType[] = ["RECEIPT", "OPENING_BALANCE", "RETURN_FROM_PROJECT", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "LOSS", "WRITE_OFF"];
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <select name="warehouseId" required className={`${electroInputCls} !w-40`} aria-label="Skladište">
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
      </select>
      <select name="type" className={`${electroInputCls} !w-40`} aria-label="Vrsta">
        {types.map((t) => <option key={t} value={t}>{ELECTRO_MOVEMENT_TYPE_LABELS[t]}</option>)}
      </select>
      <input name="quantity" placeholder="Količina" inputMode="decimal" required className={`${electroInputCls} !w-24`} aria-label="Količina" />
      <input name="reason" placeholder="Razlog" className={`${electroInputCls} !w-40`} aria-label="Razlog" />
      <button type="submit" disabled={pending} className={electroSecondaryBtnCls}>{pending ? "…" : "Proknjiži"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
      {state.ok && <p className={`${electroOkCls} w-full`}>Pomak je proknjižen.</p>}
    </form>
  );
}

export function ElectroReportConsumptionForm({
  projects,
  items,
  warehouses,
}: {
  projects: Opt[];
  items: Opt[];
  warehouses: Opt[];
}) {
  const [state, action, pending] = useActionState<ElectroConsumptionResult, FormData>(
    (prev, form) => electroReportConsumption(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={electroLabelCls}>Projekt *</label>
          <select name="projectId" required className={electroInputCls}>{projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        <div><label className={electroLabelCls}>Skladište *</label>
          <select name="warehouseId" required className={electroInputCls}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}</select></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={electroLabelCls}>Artikl *</label>
          <select name="itemId" required className={electroInputCls}>{items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></div>
        <div><label className={electroLabelCls}>Količina *</label><input name="quantity" inputMode="decimal" required className={electroInputCls} /></div>
      </div>
      <div><label className={electroLabelCls}>Komentar</label><input name="comment" className={electroInputCls} /></div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Potrošnja je prijavljena i čeka potvrdu voditelja.</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Prijavi potrošnju"}</button>
    </form>
  );
}

export function ElectroConfirmConsumptionForm({ consumptionId, requested, unit }: { consumptionId: string; requested: number; unit: string }) {
  const [state, action, pending] = useActionState<ElectroConsumptionResult, FormData>(
    (prev, form) => electroConfirmConsumption(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="consumptionId" value={consumptionId} />
      <input name="confirmQuantity" defaultValue={requested} inputMode="decimal" className={`${electroInputCls} !w-24 !py-1.5 text-sm`} aria-label="Potvrđena količina" />
      <span className="text-xs text-muted">{unit}</span>
      <button type="submit" name="decision" value="confirm" disabled={pending} className={`${electroPrimaryBtnCls} !py-1.5 text-xs`}>Potvrdi</button>
      <button type="submit" name="decision" value="reject" disabled={pending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>Odbij</button>
      {state.error && <p className={`${electroErrorCls} w-full !py-1 text-xs`}>{state.error}</p>}
    </form>
  );
}
