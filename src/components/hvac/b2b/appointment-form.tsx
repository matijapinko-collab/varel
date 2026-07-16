"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { APPOINTMENT_STATUS, PRIORITY } from "@/lib/hvac/b2b-config";
import type { ApptResult } from "@/server/actions/hvac-appointments";
import type { HvacAppointmentStatus, HvacPriority } from "@/generated/prisma/client";

export type FormOptions = {
  customers: { id: string; name: string }[];
  locations: { id: string; customerId: string; name: string }[];
  units: { id: string; customerId: string; label: string }[];
  services: { id: string; name: string; durationMin: number }[];
  technicians: { id: string; name: string }[];
};

export type ApptDefaults = {
  customerId?: string; locationId?: string; unitId?: string; serviceId?: string; technicianId?: string;
  date?: string; startTime?: string; durationMin?: number;
  status?: HvacAppointmentStatus; priority?: HvacPriority;
  problemDescription?: string; internalNote?: string; customerNote?: string;
};

type Values = {
  customerId: string; locationId: string; unitId: string; serviceId: string; technicianId: string;
  date: string; startTime: string; durationMin: number;
  status: HvacAppointmentStatus; priority: HvacPriority;
  problemDescription: string; internalNote: string; customerNote: string;
};

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sky-500";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

/**
 * Fully controlled so nothing is lost when the server action returns a conflict
 * and React re-renders the form (React 19 otherwise resets uncontrolled fields).
 */
export function AppointmentForm({
  options, defaults, action, submitLabel,
}: {
  options: FormOptions;
  defaults: ApptDefaults;
  action: (prev: ApptResult, form: FormData) => Promise<ApptResult>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ApptResult, FormData>((p, f) => action(p, f), {});
  const [v, setV] = useState<Values>({
    customerId: defaults.customerId ?? "",
    locationId: defaults.locationId ?? "",
    unitId: defaults.unitId ?? "",
    serviceId: defaults.serviceId ?? "",
    technicianId: defaults.technicianId ?? "",
    date: defaults.date ?? "",
    startTime: defaults.startTime ?? "08:00",
    durationMin: defaults.durationMin ?? 60,
    status: defaults.status ?? "WAITING_CONFIRMATION",
    priority: defaults.priority ?? "NORMAL",
    problemDescription: defaults.problemDescription ?? "",
    internalNote: defaults.internalNote ?? "",
    customerNote: defaults.customerNote ?? "",
  });
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

  const locations = useMemo(() => options.locations.filter((l) => l.customerId === v.customerId), [options.locations, v.customerId]);
  const units = useMemo(() => options.units.filter((u) => u.customerId === v.customerId), [options.units, v.customerId]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Klijent" required>
          <select name="customerId" required value={v.customerId} onChange={(e) => set("customerId", e.target.value)} className={input}>
            <option value="">— odaberite —</option>
            {options.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Lokacija">
          <select name="locationId" value={v.locationId} onChange={(e) => set("locationId", e.target.value)} className={input} disabled={!v.customerId}>
            <option value="">{v.customerId ? "— odaberite —" : "Prvo odaberite klijenta"}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Klima-uređaj">
          <select name="unitId" value={v.unitId} onChange={(e) => set("unitId", e.target.value)} className={input} disabled={!v.customerId}>
            <option value="">—</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </Field>
        <Field label="Usluga">
          <select
            name="serviceId"
            value={v.serviceId}
            onChange={(e) => {
              const s = options.services.find((x) => x.id === e.target.value);
              setV((prev) => ({ ...prev, serviceId: e.target.value, durationMin: s ? s.durationMin : prev.durationMin }));
            }}
            className={input}
          >
            <option value="">—</option>
            {options.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Majstor">
          <select name="technicianId" value={v.technicianId} onChange={(e) => set("technicianId", e.target.value)} className={input}>
            <option value="">Nedodijeljeno</option>
            {options.technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Prioritet">
          <select name="priority" value={v.priority} onChange={(e) => set("priority", e.target.value as HvacPriority)} className={input}>
            {(Object.keys(PRIORITY) as HvacPriority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
        </Field>
        <Field label="Datum" required>
          <input type="date" name="date" required value={v.date} onChange={(e) => set("date", e.target.value)} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Početak" required>
            <input type="time" name="startTime" required value={v.startTime} onChange={(e) => set("startTime", e.target.value)} className={input} />
          </Field>
          <Field label="Trajanje (min)">
            <input type="number" name="durationMin" min={15} step={15} value={v.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} className={input} />
          </Field>
        </div>
        <Field label="Status">
          <select name="status" value={v.status} onChange={(e) => set("status", e.target.value as HvacAppointmentStatus)} className={input}>
            {(Object.keys(APPOINTMENT_STATUS) as HvacAppointmentStatus[]).map((s) => (
              <option key={s} value={s}>{APPOINTMENT_STATUS[s].label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Opis kvara / zahtjeva">
        <textarea name="problemDescription" rows={2} value={v.problemDescription} onChange={(e) => set("problemDescription", e.target.value)} className={input} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Interna bilješka">
          <textarea name="internalNote" rows={2} value={v.internalNote} onChange={(e) => set("internalNote", e.target.value)} className={input} />
        </Field>
        <Field label="Bilješka za klijenta">
          <textarea name="customerNote" rows={2} value={v.customerNote} onChange={(e) => set("customerNote", e.target.value)} className={input} />
        </Field>
      </div>

      {state.error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>}

      {state.conflict && (
        <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {state.conflict}
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="force" value="true" className="h-4 w-4 accent-sky-500" /> Svejedno spremi (preklapanje je u redu)
          </label>
        </div>
      )}

      <button type="submit" disabled={pending} className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Spremam…" : submitLabel}
      </button>
    </form>
  );
}
