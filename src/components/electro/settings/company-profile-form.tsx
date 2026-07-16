"use client";

import { useActionState } from "react";
import { electroUpdateCompanyProfile, type ElectroCompanyResult } from "@/server/actions/electro-company";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

export function ElectroCompanyProfileForm({
  initial,
}: {
  initial: { name: string; oib: string; address: string; city: string; contactEmail: string; contactPhone: string };
}) {
  const [state, action, pending] = useActionState<ElectroCompanyResult, FormData>(
    (prev, form) => electroUpdateCompanyProfile(prev, form),
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={electroLabelCls}>Naziv tvrtke *</label>
        <input id="name" name="name" type="text" required defaultValue={initial.name} className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="oib" className={electroLabelCls}>OIB</label>
          <input id="oib" name="oib" type="text" defaultValue={initial.oib} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="city" className={electroLabelCls}>Grad</label>
          <input id="city" name="city" type="text" defaultValue={initial.city} className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="address" className={electroLabelCls}>Adresa</label>
        <input id="address" name="address" type="text" defaultValue={initial.address} className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contactEmail" className={electroLabelCls}>Kontakt e-mail</label>
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="contactPhone" className={electroLabelCls}>Kontakt telefon</label>
          <input id="contactPhone" name="contactPhone" type="tel" defaultValue={initial.contactPhone} className={electroInputCls} />
        </div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Profil tvrtke je spremljen.</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>
        {pending ? "Spremanje…" : "Spremi profil tvrtke"}
      </button>
    </form>
  );
}
