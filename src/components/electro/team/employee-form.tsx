"use client";

import { useActionState } from "react";
import {
  electroCreateEmployee,
  electroUpdateEmployee,
  type ElectroTeamResult,
} from "@/server/actions/electro-team";
import { ELECTRO_ROLE_NAMES, type ElectroRoleKey } from "@/lib/electro/constants";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Option = { id: string; name: string };

export function ElectroEmployeeForm({
  mode,
  userId,
  initial,
  branches,
  departments,
}: {
  mode: "create" | "edit";
  userId?: string;
  initial?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    roles: ElectroRoleKey[];
    branchIds: string[];
    departmentIds: string[];
  };
  branches: Option[];
  departments: Option[];
}) {
  const action = mode === "create" ? electroCreateEmployee : electroUpdateEmployee;
  const [state, formAction, pending] = useActionState<ElectroTeamResult, FormData>(
    (prev, form) => action(prev, form),
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {userId && <input type="hidden" name="userId" value={userId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={electroLabelCls}>Ime *</label>
          <input id="firstName" name="firstName" type="text" required defaultValue={initial?.firstName} className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="lastName" className={electroLabelCls}>Prezime *</label>
          <input id="lastName" name="lastName" type="text" required defaultValue={initial?.lastName} className={electroInputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={electroLabelCls}>E-mail {mode === "create" ? "*" : "(nije moguće mijenjati)"}</label>
          <input id="email" name="email" type="email" required={mode === "create"} disabled={mode === "edit"} defaultValue={initial?.email} className={`${electroInputCls} disabled:opacity-60`} />
        </div>
        <div>
          <label htmlFor="phone" className={electroLabelCls}>Telefon</label>
          <input id="phone" name="phone" type="tel" defaultValue={initial?.phone} className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="jobTitle" className={electroLabelCls}>Radno mjesto</label>
        <input id="jobTitle" name="jobTitle" type="text" defaultValue={initial?.jobTitle} className={electroInputCls} />
      </div>

      <fieldset>
        <legend className={electroLabelCls}>Uloge * (moguće je više)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.entries(ELECTRO_ROLE_NAMES) as [ElectroRoleKey, string][]).map(([key, name]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <input type="checkbox" name="roles" value={key} defaultChecked={initial?.roles.includes(key)} className="accent-emerald-600" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      {branches.length > 0 && (
        <fieldset>
          <legend className={electroLabelCls}>Podružnice</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                <input type="checkbox" name="branchIds" value={b.id} defaultChecked={initial?.branchIds.includes(b.id)} className="accent-emerald-600" />
                {b.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {departments.length > 0 && (
        <fieldset>
          <legend className={electroLabelCls}>Odjeli</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {departments.map((d) => (
              <label key={d.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                <input type="checkbox" name="departmentIds" value={d.id} defaultChecked={initial?.departmentIds.includes(d.id)} className="accent-emerald-600" />
                {d.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Promjene su spremljene.</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Spremanje…" : mode === "create" ? "Dodaj zaposlenika i pošalji pozivnicu" : "Spremi promjene"}
      </button>
      {mode === "create" && (
        <p className="text-xs text-muted">
          Zaposlenik dobiva e-mail s poveznicom za postavljanje vlastite lozinke. Lozinke se nikada ne
          postavljaju umjesto korisnika.
        </p>
      )}
    </form>
  );
}
