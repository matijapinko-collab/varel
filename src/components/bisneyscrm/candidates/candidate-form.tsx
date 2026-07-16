"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveCandidate, type SaveResult } from "@/server/actions/bisneys-candidates";
import { Field, TextInput, TextArea, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";

export type CandidateFormData = {
  id?: string; firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null;
  city?: string | null; country?: string | null; status?: string; source?: string | null; seniority?: string | null;
  yearsExperience?: number | null; education?: string | null; currentEmployer?: string | null; currentPosition?: string | null;
  expectedSalary?: string | null; availability?: string | null; drivingLicense?: string | null; willingToRelocate?: boolean | null;
  rating?: number | null; notes?: string | null; nextFollowUpAt?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CandidateForm({ candidate }: { candidate?: CandidateFormData }) {
  const v = candidate ?? {};
  const isEdit = !!v.id;
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => saveCandidate(_p, f), {});

  return (
    <form action={action} className="space-y-6">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}

      <Section title="Osnovni podaci">
        <Field label="Ime" required><TextInput name="firstName" defaultValue={v.firstName ?? ""} required /></Field>
        <Field label="Prezime" required><TextInput name="lastName" defaultValue={v.lastName ?? ""} required /></Field>
        <Field label="Telefon"><TextInput name="phone" defaultValue={v.phone ?? ""} /></Field>
        <Field label="Email"><TextInput name="email" type="email" defaultValue={v.email ?? ""} /></Field>
        <Field label="Grad"><TextInput name="city" defaultValue={v.city ?? ""} /></Field>
        <Field label="Država"><TextInput name="country" defaultValue={v.country ?? ""} /></Field>
      </Section>

      <Section title="Profesionalni podaci">
        <Field label="Trenutna pozicija"><TextInput name="currentPosition" defaultValue={v.currentPosition ?? ""} /></Field>
        <Field label="Trenutni poslodavac"><TextInput name="currentEmployer" defaultValue={v.currentEmployer ?? ""} /></Field>
        <Field label="Senioritet"><TextInput name="seniority" defaultValue={v.seniority ?? ""} /></Field>
        <Field label="Godine iskustva"><TextInput name="yearsExperience" type="number" min={0} defaultValue={v.yearsExperience ?? ""} /></Field>
        <Field label="Stručna sprema"><TextInput name="education" defaultValue={v.education ?? ""} /></Field>
        <Field label="Vozačka dozvola"><TextInput name="drivingLicense" defaultValue={v.drivingLicense ?? ""} /></Field>
        <Field label="Očekivana plaća"><TextInput name="expectedSalary" defaultValue={v.expectedSalary ?? ""} /></Field>
        <Field label="Dostupnost"><TextInput name="availability" defaultValue={v.availability ?? ""} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="willingToRelocate" defaultChecked={!!v.willingToRelocate} className="h-4 w-4 accent-[var(--primary)]" /> Spreman na preseljenje</label>
      </Section>

      <Section title="Recruitment">
        <Field label="Status">
          <SelectInput name="status" defaultValue={v.status ?? "NEW"}>
            {CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}
          </SelectInput>
        </Field>
        <Field label="Izvor kandidata"><TextInput name="source" defaultValue={v.source ?? ""} /></Field>
        <Field label="Ocjena (1–5)"><TextInput name="rating" type="number" min={1} max={5} defaultValue={v.rating ?? ""} /></Field>
        <Field label="Sljedeći follow-up"><TextInput name="nextFollowUpAt" type="date" defaultValue={v.nextFollowUpAt ?? ""} /></Field>
        {isEdit && <div className="sm:col-span-2"><Field label="Napomena uz promjenu statusa" hint="Sprema se u povijest statusa ako se status promijeni."><TextInput name="statusNote" /></Field></div>}
        <div className="sm:col-span-2"><Field label="Bilješke"><TextArea name="notes" defaultValue={v.notes ?? ""} /></Field></div>
      </Section>

      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{pending ? "Spremanje…" : "Spremi"}</button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:border-indigo-500/50">Odustani</button>
      </div>
    </form>
  );
}
