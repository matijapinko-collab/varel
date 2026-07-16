"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveCandidate, type SaveResult } from "@/server/actions/bisneys-candidates";
import { Field, TextInput, TextArea, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";
import {
  PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES, EDUCATION_LEVEL_LABELS, EDUCATION_LEVEL_VALUES,
  AVAILABILITY_LABELS, AVAILABILITY_VALUES, RELOCATION_LABELS, RELOCATION_VALUES,
  CANDIDATE_SOURCE_LABELS, CANDIDATE_SOURCE_VALUES,
} from "@/lib/bisneyscrm/candidates/labels";

export type CandidateFormData = {
  id?: string; firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null;
  linkedinUrl?: string | null; city?: string | null; country?: string | null; status?: string; source?: string | null;
  seniority?: string | null; yearsExperience?: number | null; education?: string | null; currentEmployer?: string | null;
  currentPosition?: string | null; expectedSalary?: string | null; availability?: string | null; drivingLicense?: string | null;
  willingToRelocate?: boolean | null; rating?: number | null; notes?: string | null; nextFollowUpAt?: string | null;
  profileStatus?: string; candidateSource?: string | null; primaryProfessionId?: string | null; educationLevel?: string | null;
  availabilityStatus?: string | null; availableFrom?: string | null; noticePeriodDays?: number | null; relocationPreference?: string | null;
  expectedSalaryMin?: string | null; expectedSalaryMax?: string | null; salaryCurrency?: string | null;
  fieldWorkWilling?: boolean; internationalField?: boolean; multiDayField?: boolean; shiftWork?: boolean; nightWork?: boolean; heightWork?: boolean; physicalWork?: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
const Toggle = ({ name, label, checked }: { name: string; label: string; checked?: boolean }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-[var(--primary)]" /> {label}</label>
);

export function CandidateForm({ candidate, professions }: { candidate?: CandidateFormData; professions: { id: string; name: string }[] }) {
  const v = candidate ?? {};
  const isEdit = !!v.id;
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => saveCandidate(_p, f), {});

  return (
    <form action={action} className="space-y-6">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}

      <Section title="Identitet i kontakt">
        <Field label="Ime" required><TextInput name="firstName" defaultValue={v.firstName ?? ""} required /></Field>
        <Field label="Prezime" required><TextInput name="lastName" defaultValue={v.lastName ?? ""} required /></Field>
        <Field label="Telefon"><TextInput name="phone" defaultValue={v.phone ?? ""} /></Field>
        <Field label="Email"><TextInput name="email" type="email" defaultValue={v.email ?? ""} /></Field>
        <Field label="LinkedIn"><TextInput name="linkedinUrl" defaultValue={v.linkedinUrl ?? ""} /></Field>
        <Field label="Grad"><TextInput name="city" defaultValue={v.city ?? ""} /></Field>
        <Field label="Država"><TextInput name="country" defaultValue={v.country ?? ""} /></Field>
      </Section>

      <Section title="Zanimanje i iskustvo">
        <Field label="Primarno zanimanje">
          <SelectInput name="primaryProfessionId" defaultValue={v.primaryProfessionId ?? ""}><option value="">—</option>{professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput>
        </Field>
        <Field label="Trenutna pozicija"><TextInput name="currentPosition" defaultValue={v.currentPosition ?? ""} /></Field>
        <Field label="Trenutni poslodavac"><TextInput name="currentEmployer" defaultValue={v.currentEmployer ?? ""} /></Field>
        <Field label="Godine iskustva"><TextInput name="yearsExperience" type="number" min={0} defaultValue={v.yearsExperience ?? ""} /></Field>
        <Field label="Senioritet"><TextInput name="seniority" defaultValue={v.seniority ?? ""} /></Field>
        <Field label="Razina obrazovanja">
          <SelectInput name="educationLevel" defaultValue={v.educationLevel ?? ""}><option value="">—</option>{EDUCATION_LEVEL_VALUES.map((e) => <option key={e} value={e}>{EDUCATION_LEVEL_LABELS[e]}</option>)}</SelectInput>
        </Field>
        <Field label="Vozačka dozvola"><TextInput name="drivingLicense" defaultValue={v.drivingLicense ?? ""} /></Field>
      </Section>

      <Section title="Dostupnost i uvjeti">
        <Field label="Status dostupnosti">
          <SelectInput name="availabilityStatus" defaultValue={v.availabilityStatus ?? ""}><option value="">—</option>{AVAILABILITY_VALUES.map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}</SelectInput>
        </Field>
        <Field label="Dostupan od"><TextInput name="availableFrom" type="date" defaultValue={v.availableFrom ?? ""} /></Field>
        <Field label="Otkazni rok (dana)"><TextInput name="noticePeriodDays" type="number" min={0} defaultValue={v.noticePeriodDays ?? ""} /></Field>
        <Field label="Spremnost na selidbu">
          <SelectInput name="relocationPreference" defaultValue={v.relocationPreference ?? ""}><option value="">—</option>{RELOCATION_VALUES.map((r) => <option key={r} value={r}>{RELOCATION_LABELS[r]}</option>)}</SelectInput>
        </Field>
        <div className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Toggle name="fieldWorkWilling" label="Terenski rad" checked={v.fieldWorkWilling} />
          <Toggle name="multiDayField" label="Višednevni teren" checked={v.multiDayField} />
          <Toggle name="internationalField" label="Međunarodni teren" checked={v.internationalField} />
          <Toggle name="shiftWork" label="Smjenski rad" checked={v.shiftWork} />
          <Toggle name="nightWork" label="Noćni rad" checked={v.nightWork} />
          <Toggle name="heightWork" label="Rad na visini" checked={v.heightWork} />
          <Toggle name="physicalWork" label="Fizički zahtjevan rad" checked={v.physicalWork} />
        </div>
      </Section>

      <Section title="Plaća">
        <Field label="Očekivana plaća od (€)"><TextInput name="expectedSalaryMin" inputMode="decimal" defaultValue={v.expectedSalaryMin ?? ""} /></Field>
        <Field label="Očekivana plaća do (€)"><TextInput name="expectedSalaryMax" inputMode="decimal" defaultValue={v.expectedSalaryMax ?? ""} /></Field>
        <Field label="Valuta"><TextInput name="salaryCurrency" defaultValue={v.salaryCurrency ?? "EUR"} /></Field>
      </Section>

      <Section title="Recruitment">
        <Field label="Status profila">
          <SelectInput name="profileStatus" defaultValue={v.profileStatus ?? "ACTIVE"}>{PROFILE_STATUS_VALUES.map((s) => <option key={s} value={s}>{PROFILE_STATUS_LABELS[s]}</option>)}</SelectInput>
        </Field>
        <Field label="Status u pipelineu">
          <SelectInput name="status" defaultValue={v.status ?? "NEW"}>{CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}</SelectInput>
        </Field>
        <Field label="Izvor kandidata">
          <SelectInput name="candidateSource" defaultValue={v.candidateSource ?? ""}><option value="">—</option>{CANDIDATE_SOURCE_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_SOURCE_LABELS[s]}</option>)}</SelectInput>
        </Field>
        <Field label="Ocjena (1–5)"><TextInput name="rating" type="number" min={1} max={5} defaultValue={v.rating ?? ""} /></Field>
        <Field label="Sljedeći follow-up"><TextInput name="nextFollowUpAt" type="date" defaultValue={v.nextFollowUpAt ?? ""} /></Field>
        {isEdit && <div className="sm:col-span-2"><Field label="Napomena uz promjenu statusa"><TextInput name="statusNote" /></Field></div>}
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
