"use client";

import { useActionState } from "react";
import {
  electroCreateInvestor,
  electroUpdateInvestor,
  type ElectroInvestorResult,
} from "@/server/actions/electro-investors";
import { ELECTRO_INVESTOR_TYPE_LABELS } from "@/lib/electro/investor-labels";
import type { ElectroInvestorType } from "@/generated/prisma/client";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Initial = {
  type: ElectroInvestorType;
  name: string;
  oib: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
};

export function ElectroInvestorForm({
  mode,
  investorId,
  initial,
}: {
  mode: "create" | "edit";
  investorId?: string;
  initial?: Initial;
}) {
  const action = mode === "create" ? electroCreateInvestor : electroUpdateInvestor;
  const [state, formAction, pending] = useActionState<ElectroInvestorResult, FormData>(
    (prev, form) => action(prev, form),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {investorId && <input type="hidden" name="investorId" value={investorId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={electroLabelCls}>Naziv *</label>
          <input id="name" name="name" required defaultValue={initial?.name} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="type" className={electroLabelCls}>Vrsta</label>
          <select id="type" name="type" defaultValue={initial?.type ?? "LEGAL_ENTITY"} className={electroInputCls}>
            {(Object.entries(ELECTRO_INVESTOR_TYPE_LABELS) as [ElectroInvestorType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="oib" className={electroLabelCls}>OIB / ID broj</label>
          <input id="oib" name="oib" defaultValue={initial?.oib} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="country" className={electroLabelCls}>Država</label>
          <input id="country" name="country" defaultValue={initial?.country ?? "Hrvatska"} className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address" className={electroLabelCls}>Adresa</label>
          <input id="address" name="address" defaultValue={initial?.address} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="city" className={electroLabelCls}>Grad</label>
          <input id="city" name="city" defaultValue={initial?.city} className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={electroLabelCls}>E-mail</label>
          <input id="email" name="email" type="email" defaultValue={initial?.email} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="phone" className={electroLabelCls}>Telefon</label>
          <input id="phone" name="phone" type="tel" defaultValue={initial?.phone} className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className={electroLabelCls}>Napomene</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes} className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Investitor je spremljen.</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Spremanje…" : mode === "create" ? "Dodaj investitora" : "Spremi promjene"}
      </button>
    </form>
  );
}
