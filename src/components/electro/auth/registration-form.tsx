"use client";

import { useActionState } from "react";
import { electroRegisterCompany, type ElectroRegistrationResult } from "@/server/actions/electro-registration";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

export function ElectroRegistrationForm() {
  const [state, action, pending] = useActionState<ElectroRegistrationResult, FormData>(
    (_prev, form) => electroRegisterCompany(_prev, form),
    {}
  );

  if (state.ok) {
    return (
      <p className={electroOkCls}>
        Zahtjev je zaprimljen. Nakon što Varel tim odobri registraciju, na navedenu e-mail adresu
        stići će poveznica za postavljanje lozinke i početak probnog razdoblja od 10 dana.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="companyName" className={electroLabelCls}>Naziv tvrtke *</label>
        <input id="companyName" name="companyName" type="text" required className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="oib" className={electroLabelCls}>OIB</label>
          <input id="oib" name="oib" type="text" inputMode="numeric" className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="city" className={electroLabelCls}>Grad</label>
          <input id="city" name="city" type="text" className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="address" className={electroLabelCls}>Adresa</label>
        <input id="address" name="address" type="text" className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={electroLabelCls}>Ime *</label>
          <input id="firstName" name="firstName" type="text" required className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="lastName" className={electroLabelCls}>Prezime *</label>
          <input id="lastName" name="lastName" type="text" required className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={electroLabelCls}>E-mail *</label>
          <input id="email" name="email" type="email" required className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="phone" className={electroLabelCls}>Telefon</label>
          <input id="phone" name="phone" type="tel" className={electroInputCls} />
        </div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Slanje…" : "Pošalji zahtjev za registraciju"}
      </button>
      <p className="text-xs text-muted">
        Registracije se odobravaju ručno. Probno razdoblje od 10 dana počinje tek nakon odobrenja.
      </p>
    </form>
  );
}
