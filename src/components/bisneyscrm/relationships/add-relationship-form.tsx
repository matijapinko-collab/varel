"use client";

import { useActionState } from "react";
import { addRelationship, type SaveResult } from "@/server/actions/bisneys-relationships";
import { Field, SelectInput, TextInput } from "@/components/bisneyscrm/shared/ui";

type Opt = { id: string; name: string };

export function AddRelationshipForm({
  sourcePersonId, sourceName, people, types, companies,
}: {
  sourcePersonId: string; sourceName: string; people: Opt[]; types: { id: string; name: string; category: string | null }[]; companies: Opt[];
}) {
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => addRelationship(_p, f), {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sourcePersonId" value={sourcePersonId} />
      <p className="text-sm text-muted"><b>{sourceName}</b> …</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vrsta odnosa" required>
          <SelectInput name="relationshipTypeId" required defaultValue="">
            <option value="">Odaberi…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Druga osoba" required>
          <SelectInput name="targetPersonId" required defaultValue="">
            <option value="">Odaberi osobu…</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Tvrtka (opcionalno)">
          <SelectInput name="companyId" defaultValue="">
            <option value="">—</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Izvor informacije"><TextInput name="infoSource" placeholder="npr. LinkedIn, preporuka" /></Field>
        <div className="sm:col-span-2"><Field label="Napomena"><TextInput name="note" /></Field></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" className="h-4 w-4 accent-[var(--primary)]" /> Potvrđena informacija</label>
      </div>
      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{pending ? "Spremanje…" : "Dodaj odnos"}</button>
    </form>
  );
}
