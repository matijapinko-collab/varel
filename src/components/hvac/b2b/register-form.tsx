"use client";

import { useActionState } from "react";
import { registerCompany, type RegisterResult } from "@/server/actions/hvac-b2b-auth";
import { PLAN_CONFIG } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { authInputCls } from "./auth-shell";

function Field({ id, label, children, required }: { id: string; label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterResult, FormData>(
    (_prev, form) => registerCompany(_prev, form),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ownerName" label="Ime i prezime" required><input id="ownerName" name="ownerName" required className={authInputCls} /></Field>
        <Field id="company" label="Naziv obrta ili tvrtke" required><input id="company" name="company" required className={authInputCls} /></Field>
        <Field id="email" label="Poslovni e-mail" required><input id="email" name="email" type="email" required autoComplete="email" className={authInputCls} /></Field>
        <Field id="phone" label="Telefon"><input id="phone" name="phone" type="tel" className={authInputCls} /></Field>
        <Field id="oib" label="OIB"><input id="oib" name="oib" inputMode="numeric" maxLength={11} className={authInputCls} /></Field>
        <Field id="legalForm" label="Pravni oblik"><input id="legalForm" name="legalForm" placeholder="obrt, d.o.o., j.d.o.o." className={authInputCls} /></Field>
        <Field id="address" label="Adresa"><input id="address" name="address" className={authInputCls} /></Field>
        <Field id="city" label="Grad"><input id="city" name="city" className={authInputCls} /></Field>
        <Field id="postalCode" label="Poštanski broj"><input id="postalCode" name="postalCode" className={authInputCls} /></Field>
        <Field id="password" label="Lozinka" required><input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className={authInputCls} /></Field>
        <Field id="plan" label="Paket" required>
          <select id="plan" name="plan" defaultValue="START" className={authInputCls}>
            {(Object.keys(PLAN_CONFIG) as (keyof typeof PLAN_CONFIG)[]).map((k) => (
              <option key={k} value={k}>
                {PLAN_CONFIG[k].name} — {formatEur(PLAN_CONFIG[k].monthlyPriceEur)}/mj · {PLAN_CONFIG[k].includedUsers} kor.
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="text-xs text-muted">
        Lozinka mora imati najmanje 10 znakova. Plaćanje je mjesečno, bez dugoročnog ugovora. Sve cijene su bez PDV-a.
      </p>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-sky-500" /> Prihvaćam uvjete korištenja.
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="privacy" className="mt-0.5 h-4 w-4 accent-sky-500" /> Prihvaćam pravila privatnosti.
      </label>

      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Kreiram račun…" : "Otvori Varel HVAC račun"}
      </button>
    </form>
  );
}
