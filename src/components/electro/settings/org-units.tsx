"use client";

import { useActionState } from "react";
import {
  electroCreateBranch,
  electroUpdateBranch,
  electroCreateDepartment,
  electroUpdateDepartment,
  type ElectroCompanyResult,
} from "@/server/actions/electro-company";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

type Branch = { id: string; name: string; city: string | null; isActive: boolean; memberCount: number };
type Department = { id: string; name: string; isActive: boolean; memberCount: number };

function AddBranchForm() {
  const [state, action, pending] = useActionState<ElectroCompanyResult, FormData>(
    (prev, form) => electroCreateBranch(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="name" placeholder="Naziv podružnice" required className={`${electroInputCls} !w-48`} aria-label="Naziv podružnice" />
      <input name="city" placeholder="Grad" className={`${electroInputCls} !w-36`} aria-label="Grad" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

function DeactivateBranchForm({ id }: { id: string }) {
  const [, action, pending] = useActionState<ElectroCompanyResult, FormData>(
    (prev, form) => electroUpdateBranch(prev, form),
    {}
  );
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("Deaktivirati podružnicu?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="branchId" value={id} />
      <input type="hidden" name="deactivate" value="true" />
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !px-2.5 !py-1 text-xs`}>Deaktiviraj</button>
    </form>
  );
}

function AddDepartmentForm() {
  const [state, action, pending] = useActionState<ElectroCompanyResult, FormData>(
    (prev, form) => electroCreateDepartment(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="name" placeholder="Naziv odjela" required className={`${electroInputCls} !w-48`} aria-label="Naziv odjela" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

function DeactivateDepartmentForm({ id }: { id: string }) {
  const [, action, pending] = useActionState<ElectroCompanyResult, FormData>(
    (prev, form) => electroUpdateDepartment(prev, form),
    {}
  );
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("Deaktivirati odjel?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="departmentId" value={id} />
      <input type="hidden" name="deactivate" value="true" />
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !px-2.5 !py-1 text-xs`}>Deaktiviraj</button>
    </form>
  );
}

export function ElectroOrgUnits({ branches, departments }: { branches: Branch[]; departments: Department[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h3 className="font-bold">Podružnice</h3>
        <ul className="mt-2 space-y-1.5">
          {branches.filter((b) => b.isActive).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <span>{b.name}{b.city && <span className="text-muted"> · {b.city}</span>}<span className="text-muted"> · {b.memberCount} čl.</span></span>
              <DeactivateBranchForm id={b.id} />
            </li>
          ))}
          {branches.filter((b) => b.isActive).length === 0 && <li className="text-sm text-muted">Još nema podružnica.</li>}
        </ul>
        <div className="mt-3"><AddBranchForm /></div>
      </section>

      <section>
        <h3 className="font-bold">Odjeli</h3>
        <ul className="mt-2 space-y-1.5">
          {departments.filter((d) => d.isActive).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <span>{d.name}<span className="text-muted"> · {d.memberCount} čl.</span></span>
              <DeactivateDepartmentForm id={d.id} />
            </li>
          ))}
          {departments.filter((d) => d.isActive).length === 0 && <li className="text-sm text-muted">Još nema odjela.</li>}
        </ul>
        <div className="mt-3"><AddDepartmentForm /></div>
      </section>
    </div>
  );
}
