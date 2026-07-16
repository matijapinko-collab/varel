"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveService, type SaveResult } from "@/server/actions/bisneys-services";
import { Field, TextInput, TextArea } from "@/components/bisneyscrm/shared/ui";

export type ServiceFormData = {
  id?: string; name?: string; description?: string | null; isActive?: boolean; basePrice?: string | null;
  currency?: string | null; billingModel?: string | null; color?: string | null; icon?: string | null;
};

export function ServiceForm({ service }: { service?: ServiceFormData }) {
  const v = service ?? { isActive: true };
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveResult, FormData>((_p, f) => saveService(_p, f), {});

  return (
    <form action={action} className="space-y-4">
      {v.id && <input type="hidden" name="id" defaultValue={v.id} />}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naziv" required><TextInput name="name" defaultValue={v.name ?? ""} required /></Field>
          <Field label="Billing model" hint="npr. fixed, hourly, success fee"><TextInput name="billingModel" defaultValue={v.billingModel ?? ""} /></Field>
          <Field label="Osnovna cijena"><TextInput name="basePrice" inputMode="decimal" defaultValue={v.basePrice ?? ""} /></Field>
          <Field label="Valuta"><TextInput name="currency" defaultValue={v.currency ?? "EUR"} /></Field>
          <Field label="Boja (hex)"><TextInput name="color" defaultValue={v.color ?? ""} placeholder="#6366f1" /></Field>
          <Field label="Ikona"><TextInput name="icon" defaultValue={v.icon ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Opis"><TextArea name="description" defaultValue={v.description ?? ""} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={v.isActive ?? true} className="h-4 w-4 accent-[var(--primary)]" /> Aktivna usluga</label>
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
