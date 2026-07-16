"use client";

import { useActionState } from "react";
import {
  electroUpdatePlan,
  electroSetPlanLimit,
  type ElectroPlanResult,
} from "@/server/actions/electro-superadmin-plans";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Limit = { key: string; intValue: number | null; boolValue: boolean | null };
type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthlyEur: string | null;
  trialDays: number;
  isActive: boolean;
  limits: Limit[];
};

function PlanMetaForm({ plan }: { plan: Plan }) {
  const [state, action, pending] = useActionState<ElectroPlanResult, FormData>(
    (prev, form) => electroUpdatePlan(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="planId" value={plan.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={electroLabelCls}>Naziv</label>
          <input name="name" defaultValue={plan.name} required className={electroInputCls} />
        </div>
        <div>
          <label className={electroLabelCls}>Cijena (€ / mj, prazno = na upit)</label>
          <input name="priceMonthlyEur" defaultValue={plan.priceMonthlyEur ?? ""} inputMode="decimal" className={electroInputCls} />
        </div>
      </div>
      <div>
        <label className={electroLabelCls}>Opis</label>
        <input name="description" defaultValue={plan.description ?? ""} className={electroInputCls} />
      </div>
      <div className="flex items-end gap-4">
        <div>
          <label className={electroLabelCls}>Trial (dana)</label>
          <input name="trialDays" type="number" min={1} max={365} defaultValue={plan.trialDays} className={`${electroInputCls} !w-28`} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="accent-emerald-600" /> Aktivan
        </label>
        <button type="submit" disabled={pending} className={`${electroPrimaryBtnCls} ml-auto`}>{pending ? "…" : "Spremi paket"}</button>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Paket je spremljen.</p>}
    </form>
  );
}

function LimitForm({ planId, limit }: { planId: string; limit: Limit }) {
  const [state, action, pending] = useActionState<ElectroPlanResult, FormData>(
    (prev, form) => electroSetPlanLimit(prev, form),
    {}
  );
  const isBool = limit.boolValue !== null;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="key" value={limit.key} />
      <input type="hidden" name="kind" value={isBool ? "bool" : "int"} />
      <span className="w-44 truncate text-sm" title={limit.key}>{limit.key}</span>
      {isBool ? (
        <select name="value" defaultValue={limit.boolValue ? "true" : "false"} className={`${electroInputCls} !w-28 !py-1.5 text-sm`}>
          <option value="true">Da</option>
          <option value="false">Ne</option>
        </select>
      ) : (
        <input name="value" type="number" min={0} defaultValue={limit.intValue ?? ""} placeholder="∞" className={`${electroInputCls} !w-28 !py-1.5 text-sm`} />
      )}
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>{pending ? "…" : "Spremi"}</button>
      {state.error && <span className={`${electroErrorCls} !px-2 !py-0.5 text-xs`}>{state.error}</span>}
    </form>
  );
}

export function ElectroPlanEditor({ plan }: { plan: Plan }) {
  const intLimits = plan.limits.filter((l) => l.boolValue === null).sort((a, b) => a.key.localeCompare(b.key));
  const boolLimits = plan.limits.filter((l) => l.boolValue !== null).sort((a, b) => a.key.localeCompare(b.key));
  return (
    <div className="space-y-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <PlanMetaForm plan={plan} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted">Brojčani limiti (prazno = neograničeno)</h4>
          <div className="space-y-1.5">
            {intLimits.map((l) => <LimitForm key={l.key} planId={plan.id} limit={l} />)}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted">Značajke</h4>
          <div className="space-y-1.5">
            {boolLimits.map((l) => <LimitForm key={l.key} planId={plan.id} limit={l} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
