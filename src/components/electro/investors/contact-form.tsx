"use client";

import { useActionState } from "react";
import { electroAddInvestorContact, type ElectroInvestorResult } from "@/server/actions/electro-investors";
import { electroInputCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

export function ElectroInvestorContactForm({ investorId }: { investorId: string }) {
  const [state, action, pending] = useActionState<ElectroInvestorResult, FormData>(
    (prev, form) => electroAddInvestorContact(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="investorId" value={investorId} />
      <input name="firstName" placeholder="Ime *" required className={`${electroInputCls} !w-32`} aria-label="Ime" />
      <input name="lastName" placeholder="Prezime *" required className={`${electroInputCls} !w-32`} aria-label="Prezime" />
      <input name="role" placeholder="Funkcija" className={`${electroInputCls} !w-32`} aria-label="Funkcija" />
      <input name="email" type="email" placeholder="E-mail" className={`${electroInputCls} !w-44`} aria-label="E-mail" />
      <input name="phone" type="tel" placeholder="Telefon" className={`${electroInputCls} !w-36`} aria-label="Telefon" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj kontakt"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}
