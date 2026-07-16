"use client";

import { useActionState } from "react";
import {
  electroCreateProject,
  electroUpdateProject,
  type ElectroProjectResult,
} from "@/server/actions/electro-projects";
import { ELECTRO_PROJECT_PRIORITY_LABELS } from "@/lib/electro/projects";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Option = { id: string; name: string };
type Initial = {
  name: string;
  description: string;
  priority: string;
  branchId: string;
  location: string;
  address: string;
  startDate: string;
  contractDeadline: string;
  estimatedDeadline: string;
  contractValue: string;
  plannedBudget: string;
  completionPercent: number;
  delayReason: string;
  investorIds: string[];
  version: number;
};

export function ElectroProjectForm({
  mode,
  projectId,
  initial,
  investors,
  branches,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial?: Initial;
  investors: Option[];
  branches: Option[];
}) {
  const action = mode === "create" ? electroCreateProject : electroUpdateProject;
  const [state, formAction, pending] = useActionState<ElectroProjectResult, FormData>(
    (prev, form) => action(prev, form),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {initial && <input type="hidden" name="version" value={initial.version} />}
      <div>
        <label htmlFor="name" className={electroLabelCls}>Naziv projekta *</label>
        <input id="name" name="name" required defaultValue={initial?.name} className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="description" className={electroLabelCls}>Opis</label>
        <textarea id="description" name="description" rows={2} defaultValue={initial?.description} className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="priority" className={electroLabelCls}>Prioritet</label>
          <select id="priority" name="priority" defaultValue={initial?.priority ?? "NORMAL"} className={electroInputCls}>
            {Object.entries(ELECTRO_PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="branchId" className={electroLabelCls}>Podružnica</label>
          <select id="branchId" name="branchId" defaultValue={initial?.branchId ?? ""} className={electroInputCls}>
            <option value="">—</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className={electroLabelCls}>Lokacija</label>
          <input id="location" name="location" defaultValue={initial?.location} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="address" className={electroLabelCls}>Adresa gradilišta</label>
          <input id="address" name="address" defaultValue={initial?.address} className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className={electroLabelCls}>Početak</label>
          <input id="startDate" name="startDate" type="date" defaultValue={initial?.startDate} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="contractDeadline" className={electroLabelCls}>Ugovoreni rok</label>
          <input id="contractDeadline" name="contractDeadline" type="date" defaultValue={initial?.contractDeadline} className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contractValue" className={electroLabelCls}>Ugovorena vrijednost (€)</label>
          <input id="contractValue" name="contractValue" inputMode="decimal" defaultValue={initial?.contractValue} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="plannedBudget" className={electroLabelCls}>Planirani budžet (€)</label>
          <input id="plannedBudget" name="plannedBudget" inputMode="decimal" defaultValue={initial?.plannedBudget} className={electroInputCls} />
        </div>
      </div>

      {mode === "edit" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="estimatedDeadline" className={electroLabelCls}>Procijenjeni rok</label>
            <input id="estimatedDeadline" name="estimatedDeadline" type="date" defaultValue={initial?.estimatedDeadline} className={electroInputCls} />
          </div>
          <div>
            <label htmlFor="completionPercent" className={electroLabelCls}>Dovršenost (%)</label>
            <input id="completionPercent" name="completionPercent" type="number" min={0} max={100} defaultValue={initial?.completionPercent ?? 0} className={electroInputCls} />
          </div>
        </div>
      )}

      {investors.length > 0 && (
        <fieldset>
          <legend className={electroLabelCls}>Investitori (moguće je više)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {investors.map((inv) => (
              <label key={inv.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                <input type="checkbox" name="investorIds" value={inv.id} defaultChecked={initial?.investorIds.includes(inv.id)} className="accent-emerald-600" />
                {inv.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {mode === "edit" && (
        <div>
          <label htmlFor="delayReason" className={electroLabelCls}>Razlog kašnjenja</label>
          <input id="delayReason" name="delayReason" defaultValue={initial?.delayReason} className={electroInputCls} />
        </div>
      )}

      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Projekt je spremljen.</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Spremanje…" : mode === "create" ? "Stvori projekt" : "Spremi promjene"}
      </button>
    </form>
  );
}
