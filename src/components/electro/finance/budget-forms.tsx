"use client";

import { useActionState } from "react";
import { electroSaveBudget, electroAddCost, type ElectroBudgetResult } from "@/server/actions/electro-budget";
import { electroGenerateReport, type ElectroReportResult } from "@/server/actions/electro-reports";
import { ELECTRO_COST_CATEGORY_LABELS } from "@/lib/electro/budget";
import type { ElectroCostCategory } from "@/generated/prisma/client";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type BudgetInitial = { materialBudget: string; laborBudget: string; subcontractorBudget: string; otherBudget: string; reserve: string };

export function ElectroBudgetForm({ projectId, initial }: { projectId: string; initial: BudgetInitial }) {
  const [state, action, pending] = useActionState<ElectroBudgetResult, FormData>(
    (prev, form) => electroSaveBudget(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className={electroLabelCls}>Materijal €</label><input name="materialBudget" inputMode="decimal" defaultValue={initial.materialBudget} className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Rad €</label><input name="laborBudget" inputMode="decimal" defaultValue={initial.laborBudget} className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Podizvođači €</label><input name="subcontractorBudget" inputMode="decimal" defaultValue={initial.subcontractorBudget} className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Ostalo €</label><input name="otherBudget" inputMode="decimal" defaultValue={initial.otherBudget} className={electroInputCls} /></div>
        <div><label className={electroLabelCls}>Rezerva €</label><input name="reserve" inputMode="decimal" defaultValue={initial.reserve} className={electroInputCls} /></div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Budžet je spremljen.</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Spremi budžet"}</button>
    </form>
  );
}

export function ElectroCostForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<ElectroBudgetResult, FormData>(
    (prev, form) => electroAddCost(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="category" className={`${electroInputCls} !w-40`} aria-label="Kategorija">
        {(Object.entries(ELECTRO_COST_CATEGORY_LABELS) as [ElectroCostCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input name="description" placeholder="Opis" required className={`${electroInputCls} !w-48`} aria-label="Opis" />
      <input name="amount" placeholder="Iznos €" inputMode="decimal" required className={`${electroInputCls} !w-28`} aria-label="Iznos" />
      <button type="submit" disabled={pending} className={electroSecondaryBtnCls}>{pending ? "…" : "Dodaj trošak"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

export function ElectroGenerateReportButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<ElectroReportResult, FormData>(
    (prev, form) => electroGenerateReport(prev, form),
    {}
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="kind" value="progress" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "Generiranje…" : "Generiraj PDF izvještaj"}</button>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
    </form>
  );
}
