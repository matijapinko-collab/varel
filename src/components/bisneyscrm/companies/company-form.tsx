"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveCompany, type SaveResult } from "@/server/actions/bisneys-companies";
import { Field, TextInput, TextArea, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { SALES_STATUS_LABELS, SALES_STATUS_VALUES } from "@/lib/bisneyscrm/trello/mapping";

export type CompanyFormData = {
  id?: string; name?: string; legalName?: string | null; oib?: string | null; website?: string | null;
  industry?: string | null; size?: string | null; country?: string | null; city?: string | null;
  address?: string | null; phone?: string | null; email?: string | null; description?: string | null;
  status?: string; leadSource?: string | null; dealValue?: string | null; currency?: string | null;
  expectedCloseDate?: string | null; closeProbability?: number | null; nextFollowUpAt?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CompanyForm({ company }: { company?: CompanyFormData }) {
  const v = company ?? {};
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => saveCompany(_p, f), {});

  return (
    <form action={action} className="space-y-6">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}

      <Section title="Osnovni podaci">
        <Field label="Naziv" required><TextInput name="name" defaultValue={v.name ?? ""} required /></Field>
        <Field label="Pravni naziv"><TextInput name="legalName" defaultValue={v.legalName ?? ""} /></Field>
        <Field label="OIB"><TextInput name="oib" defaultValue={v.oib ?? ""} /></Field>
        <Field label="Web"><TextInput name="website" defaultValue={v.website ?? ""} /></Field>
        <Field label="Industrija"><TextInput name="industry" defaultValue={v.industry ?? ""} /></Field>
        <Field label="Veličina"><TextInput name="size" defaultValue={v.size ?? ""} /></Field>
        <Field label="Država"><TextInput name="country" defaultValue={v.country ?? ""} /></Field>
        <Field label="Grad"><TextInput name="city" defaultValue={v.city ?? ""} /></Field>
        <Field label="Adresa"><TextInput name="address" defaultValue={v.address ?? ""} /></Field>
        <Field label="Telefon"><TextInput name="phone" defaultValue={v.phone ?? ""} /></Field>
        <Field label="Email"><TextInput name="email" type="email" defaultValue={v.email ?? ""} /></Field>
        <div className="sm:col-span-2"><Field label="Opis"><TextArea name="description" defaultValue={v.description ?? ""} /></Field></div>
      </Section>

      <Section title="Sales podaci">
        <Field label="Status">
          <SelectInput name="status" defaultValue={v.status ?? "NEW_COMPANY"}>
            {SALES_STATUS_VALUES.map((s) => <option key={s} value={s}>{SALES_STATUS_LABELS[s]}</option>)}
          </SelectInput>
        </Field>
        <Field label="Izvor leada"><TextInput name="leadSource" defaultValue={v.leadSource ?? ""} /></Field>
        <Field label="Vrijednost posla (€)"><TextInput name="dealValue" inputMode="decimal" defaultValue={v.dealValue ?? ""} /></Field>
        <Field label="Valuta"><TextInput name="currency" defaultValue={v.currency ?? "EUR"} /></Field>
        <Field label="Očekivani datum zatvaranja"><TextInput name="expectedCloseDate" type="date" defaultValue={v.expectedCloseDate ?? ""} /></Field>
        <Field label="Vjerojatnost zatvaranja (%)"><TextInput name="closeProbability" type="number" min={0} max={100} defaultValue={v.closeProbability ?? ""} /></Field>
        <Field label="Sljedeći follow-up"><TextInput name="nextFollowUpAt" type="date" defaultValue={v.nextFollowUpAt ?? ""} /></Field>
      </Section>

      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "Spremanje…" : "Spremi"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:border-indigo-500/50">Odustani</button>
      </div>
    </form>
  );
}
