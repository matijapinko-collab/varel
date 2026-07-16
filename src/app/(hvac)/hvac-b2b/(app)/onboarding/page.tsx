import Link from "next/link";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { Field, Input, Checkbox, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { formatEur } from "@/lib/hvac/format";
import { onbCompany, onbHours, onbBooking, onbStep, onbComplete } from "@/server/actions/hvac-b2b-onboarding";
import { createTechnician, seedDefaultServices, createService } from "@/server/actions/hvac-b2b";

export const dynamic = "force-dynamic";

const STEPS = ["Tvrtka", "Usluge", "Radno vrijeme", "Majstori", "Booking", "Uvoz", "Gotovo"];
const WEEK: { key: string; label: string; defOn: boolean }[] = [
  { key: "mon", label: "Ponedjeljak", defOn: true }, { key: "tue", label: "Utorak", defOn: true },
  { key: "wed", label: "Srijeda", defOn: true }, { key: "thu", label: "Četvrtak", defOn: true },
  { key: "fri", label: "Petak", defOn: true }, { key: "sat", label: "Subota", defOn: false },
  { key: "sun", label: "Nedjelja", defOn: false },
];

export default async function OnboardingPage(props: PageProps<"/hvac-b2b/onboarding">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const requested = Number(typeof sp?.step === "string" ? sp.step : NaN);
  const step = Math.min(7, Math.max(1, Number.isFinite(requested) ? requested : ctx.tenant.onboardingStep + 1));
  const t = ctx.tenantId;

  const [services, technicians, settings, booking] = await Promise.all([
    step === 2 || step === 7 ? db.hvacService.findMany({ where: { tenantId: t }, orderBy: { position: "asc" } }) : Promise.resolve([]),
    step === 4 || step === 7 ? db.hvacTechnician.findMany({ where: { tenantId: t, deletedAt: null }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    step === 3 ? db.hvacTenantSettings.findUnique({ where: { tenantId: t } }) : Promise.resolve(null),
    step === 5 || step === 7 ? db.hvacBookingSettings.findUnique({ where: { tenantId: t } }) : Promise.resolve(null),
  ]);

  const hours = (settings?.workingHoursJson ?? {}) as Record<string, { enabled?: boolean; start?: string; end?: string }>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Postavljanje tvrtke</h1>
          <Link href="/hvac-b2b/nadzorna-ploca" className="text-sm text-muted hover:text-foreground">Nastavi kasnije</Link>
        </div>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i + 1 <= step ? "bg-sky-500" : "bg-border"}`} />
              <div className={`mt-1 hidden text-center text-[10px] sm:block ${i + 1 === step ? "font-semibold text-sky-600 dark:text-sky-300" : "text-muted"}`}>{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">Korak {step} od 7</p>
      </div>

      {/* Step 1 — company */}
      {step === 1 && (
        <form action={onbCompany}>
          <FormSection title="Podaci o tvrtki">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naziv tvrtke"><Input name="name" defaultValue={ctx.tenant.name} required /></Field>
              <Field label="OIB"><Input name="oib" defaultValue={ctx.tenant.oib ?? ""} inputMode="numeric" maxLength={11} /></Field>
              <Field label="Pravni oblik"><Input name="legalForm" defaultValue={ctx.tenant.legalForm ?? ""} placeholder="obrt, d.o.o." /></Field>
              <Field label="Telefon"><Input name="phone" defaultValue={ctx.tenant.phone ?? ""} /></Field>
              <Field label="Adresa"><Input name="address" defaultValue={ctx.tenant.address ?? ""} /></Field>
              <Field label="Grad"><Input name="city" defaultValue={ctx.tenant.city ?? ""} /></Field>
              <Field label="Poštanski broj"><Input name="postalCode" defaultValue={ctx.tenant.postalCode ?? ""} /></Field>
              <Field label="Poslovni e-mail"><Input name="email" type="email" defaultValue={ctx.tenant.email ?? ""} /></Field>
              <Field label="Web-stranica"><Input name="website" defaultValue={ctx.tenant.website ?? ""} /></Field>
            </div>
            <Field label="Podnožje dokumenata (za ponude i račune)"><Textarea name="documentFooter" rows={2} defaultValue={ctx.tenant.documentFooter ?? ""} /></Field>
            <Checkbox name="vatRegistered" label="Tvrtka je u sustavu PDV-a" defaultChecked={ctx.tenant.vatRegistered} />
            <SubmitButton label="Spremi i nastavi" />
          </FormSection>
        </form>
      )}

      {/* Step 2 — services */}
      {step === 2 && (
        <FormSection title="Usluge">
          {services.length === 0 ? (
            <form action={seedDefaultServices}>
              <p className="text-sm text-muted">Dodajte standardne usluge servisa klima-uređaja jednim klikom, a kasnije ih uredite.</p>
              <div className="mt-3"><SubmitButton label="Dodaj zadane usluge" /></div>
            </form>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted">{s.durationMin} min{s.defaultPriceEur ? ` · ${formatEur(Number(s.defaultPriceEur))}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <form action={createService} className="mt-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input name="name" placeholder="Nova usluga" />
            <Input name="durationMin" type="number" placeholder="min" defaultValue={60} className="w-24" />
            <Input name="defaultPriceEur" type="number" step="0.01" placeholder="€" className="w-28" />
            <SubmitButton label="Dodaj" />
          </form>
          <form action={onbStep.bind(null, 2)} className="mt-4"><SubmitButton label="Nastavi" /></form>
        </FormSection>
      )}

      {/* Step 3 — working hours */}
      {step === 3 && (
        <form action={onbHours}>
          <FormSection title="Radno vrijeme">
            <div className="space-y-2">
              {WEEK.map((d) => {
                const h = hours[d.key];
                const on = h?.enabled ?? d.defOn;
                return (
                  <div key={d.key} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                    <label className="flex w-32 items-center gap-2 text-sm">
                      <input type="checkbox" name={`${d.key}_enabled`} defaultChecked={on} className="h-4 w-4 accent-sky-500" /> {d.label}
                    </label>
                    <span className="text-xs text-muted">od</span>
                    <Input name={`${d.key}_start`} type="time" defaultValue={h?.start ?? "08:00"} className="w-28" />
                    <Input name={`${d.key}_end`} type="time" defaultValue={h?.end ?? "16:00"} className="w-28" />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/hvac-b2b/onboarding?step=2" className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</Link>
              <SubmitButton label="Spremi i nastavi" />
            </div>
          </FormSection>
        </form>
      )}

      {/* Step 4 — technicians */}
      {step === 4 && (
        <FormSection title="Majstori">
          {technicians.length > 0 && (
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {technicians.map((tech) => (
                <li key={tech.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: tech.calendarColor }} /> {tech.name}</span>
                  <span className="text-xs text-muted">{tech.specialization ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
          <form action={createTechnician} className="mt-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <Field label="Ime i prezime"><Input name="name" required /></Field>
            <Field label="Telefon"><Input name="phone" /></Field>
            <Field label="E-mail"><Input name="email" type="email" /></Field>
            <Field label="Specijalizacija"><Input name="specialization" placeholder="montaža, servis…" /></Field>
            <div className="sm:col-span-2"><SubmitButton label="Dodaj majstora" /></div>
          </form>
          <form action={onbStep.bind(null, 4)} className="mt-4"><SubmitButton label="Nastavi" /></form>
        </FormSection>
      )}

      {/* Step 5 — booking */}
      {step === 5 && (
        <form action={onbBooking}>
          <FormSection title="Online booking">
            <p className="text-sm text-muted">Vaša javna booking stranica: <span className="font-mono text-foreground">varel.io/hvac-booking/{ctx.tenant.slug}</span></p>
            <Checkbox name="enabled" label="Omogući online booking" defaultChecked={booking?.enabled ?? false} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Područje rada"><Input name="serviceArea" defaultValue={booking?.serviceArea ?? ""} placeholder="npr. Zagreb i okolica" /></Field>
              <Field label="Javni telefon"><Input name="publicPhone" defaultValue={booking?.publicPhone ?? ctx.tenant.phone ?? ""} /></Field>
              <Field label="Javni e-mail"><Input name="publicEmail" type="email" defaultValue={booking?.publicEmail ?? ctx.tenant.email ?? ""} /></Field>
            </div>
            <div className="flex gap-2">
              <Link href="/hvac-b2b/onboarding?step=4" className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</Link>
              <SubmitButton label="Spremi i nastavi" />
            </div>
          </FormSection>
        </form>
      )}

      {/* Step 6 — import */}
      {step === 6 && (
        <FormSection title="Uvoz klijenata">
          <p className="text-sm text-muted">Klijente možete uvesti iz CSV datoteke ili preskočiti ovaj korak i dodavati ih ručno kasnije.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/hvac-b2b/import-template" className="rounded-lg border border-border px-4 py-2 text-sm hover:border-sky-500/50">Preuzmi CSV predložak</a>
          </div>
          <p className="mt-3 text-xs text-muted">Detaljan uvoz s pregledom i provjerom dostupan je u modulu Klijenti.</p>
          <form action={onbStep.bind(null, 6)} className="mt-4"><SubmitButton label="Preskoči i nastavi" /></form>
        </FormSection>
      )}

      {/* Step 7 — completion */}
      {step === 7 && (
        <FormSection title="Sve je spremno">
          <ul className="space-y-2 text-sm">
            {[
              { ok: Boolean(ctx.tenant.oib || ctx.tenant.address), label: "Podaci o tvrtki uneseni" },
              { ok: services.length > 0, label: `Usluge kreirane (${services.length})` },
              { ok: technicians.length > 0, label: `Majstor dodan (${technicians.length})` },
              { ok: Boolean(booking), label: booking?.enabled ? "Booking omogućen" : "Booking konfiguriran" },
            ].map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center rounded-full ${c.ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-border text-muted"}`}><Check size={12} /></span>
                {c.label}
              </li>
            ))}
          </ul>
          <form action={onbComplete} className="mt-5"><SubmitButton label="Otvori nadzornu ploču" /></form>
        </FormSection>
      )}
    </div>
  );
}
