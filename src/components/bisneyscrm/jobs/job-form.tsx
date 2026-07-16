"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveJob, type SaveResult } from "@/server/actions/bisneys-jobs";
import { Field, TextInput, TextArea, SelectInput } from "@/components/bisneyscrm/shared/ui";

export type JobFormData = {
  id?: string; title?: string; professionName?: string | null; companyId?: string | null; location?: string | null;
  headcount?: number | null; salary?: string | null; currency?: string | null; contractType?: string | null;
  startDate?: string | null; status?: string | null; description?: string | null; requirements?: string | null;
  languages?: string | null; licenses?: string | null;
};

export function JobForm({ job, companies }: { job?: JobFormData; companies: { id: string; name: string }[] }) {
  const v = job ?? {};
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => saveJob(_p, f), {});

  return (
    <form action={action} className="space-y-4">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naziv radnog mjesta" required><TextInput name="title" defaultValue={v.title ?? ""} required /></Field>
          <Field label="Profesija" hint="Automatski se normalizira (npr. „Serviser klima“ → HVAC serviser)."><TextInput name="professionName" defaultValue={v.professionName ?? ""} /></Field>
          <Field label="Klijent (tvrtka)">
            <SelectInput name="companyId" defaultValue={v.companyId ?? ""}>
              <option value="">—</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Lokacija"><TextInput name="location" defaultValue={v.location ?? ""} /></Field>
          <Field label="Broj traženih radnika"><TextInput name="headcount" type="number" min={1} defaultValue={v.headcount ?? ""} /></Field>
          <Field label="Plaća"><TextInput name="salary" defaultValue={v.salary ?? ""} /></Field>
          <Field label="Vrsta ugovora"><TextInput name="contractType" defaultValue={v.contractType ?? ""} /></Field>
          <Field label="Datum početka"><TextInput name="startDate" type="date" defaultValue={v.startDate ?? ""} /></Field>
          <Field label="Status"><TextInput name="status" defaultValue={v.status ?? ""} /></Field>
          <Field label="Potrebni jezici"><TextInput name="languages" defaultValue={v.languages ?? ""} /></Field>
          <Field label="Potrebne licence"><TextInput name="licenses" defaultValue={v.licenses ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Opis"><TextArea name="description" defaultValue={v.description ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Uvjeti"><TextArea name="requirements" defaultValue={v.requirements ?? ""} /></Field></div>
        </div>
      </section>
      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{pending ? "Spremanje…" : "Spremi"}</button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:border-indigo-500/50">Odustani</button>
      </div>
    </form>
  );
}
