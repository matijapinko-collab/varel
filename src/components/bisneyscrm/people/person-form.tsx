"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { savePerson, type SaveResult } from "@/server/actions/bisneys-people";
import { Field, TextInput, TextArea } from "@/components/bisneyscrm/shared/ui";

export type PersonFormData = {
  id?: string; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null;
  city?: string | null; country?: string | null; notes?: string | null; source?: string | null;
};

export function PersonForm({ person }: { person?: PersonFormData }) {
  const v = person ?? {};
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => savePerson(_p, f), {});

  return (
    <form action={action} className="space-y-4">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ime" required><TextInput name="firstName" defaultValue={v.firstName ?? ""} required /></Field>
          <Field label="Prezime" required><TextInput name="lastName" defaultValue={v.lastName ?? ""} required /></Field>
          <Field label="Email"><TextInput name="email" type="email" defaultValue={v.email ?? ""} /></Field>
          <Field label="Telefon"><TextInput name="phone" defaultValue={v.phone ?? ""} /></Field>
          <Field label="Grad"><TextInput name="city" defaultValue={v.city ?? ""} /></Field>
          <Field label="Država"><TextInput name="country" defaultValue={v.country ?? ""} /></Field>
          <Field label="Izvor"><TextInput name="source" defaultValue={v.source ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Bilješke"><TextArea name="notes" defaultValue={v.notes ?? ""} /></Field></div>
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
