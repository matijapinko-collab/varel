import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantRole, MANAGE_ROLES } from "@/lib/hvac/tenant";
import { PageHeader, Field, Input, Checkbox, SubmitButton, FormSection } from "@/components/admin/ui";
import { createService, updateService, toggleService, seedDefaultServices } from "@/server/actions/hvac-b2b";

export const dynamic = "force-dynamic";

export default async function ServicesSettingsPage() {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const services = await db.hvacService.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { position: "asc" } });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Usluge" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <form action={createService} className="mt-4">
        <FormSection title="Nova usluga">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Naziv"><Input name="name" required /></Field>
            <Field label="Trajanje (min)"><Input name="durationMin" type="number" defaultValue={60} /></Field>
            <Field label="Zadana cijena (€, bez PDV-a)"><Input name="defaultPriceEur" type="number" step="0.01" /></Field>
          </div>
          <div className="flex flex-wrap gap-5">
            <Checkbox name="bookingVisible" label="Vidljivo u bookingu" defaultChecked />
            <Checkbox name="manualConfirm" label="Ručna potvrda" defaultChecked />
          </div>
          <SubmitButton label="Dodaj uslugu" />
        </FormSection>
      </form>

      {services.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Još nemate usluga.
          <form action={seedDefaultServices} className="mt-3 inline-block"><SubmitButton label="Dodaj zadane usluge" /></form>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {services.map((s) => (
            <form key={s.id} action={updateService.bind(null, s.id)} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_6rem_7rem_auto_auto]">
              <Input name="name" defaultValue={s.name} />
              <Input name="durationMin" type="number" defaultValue={s.durationMin} />
              <Input name="defaultPriceEur" type="number" step="0.01" defaultValue={s.defaultPriceEur ? Number(s.defaultPriceEur) : ""} placeholder="€" />
              <input type="hidden" name="bookingVisible" value={s.bookingVisible ? "on" : ""} />
              <input type="hidden" name="manualConfirm" value={s.manualConfirm ? "on" : ""} />
              <button className="rounded-lg border border-border px-3 py-2 text-sm hover:border-sky-500/50">Spremi</button>
              <button formAction={toggleService.bind(null, s.id)} className={`rounded-lg px-3 py-2 text-sm ${s.isActive ? "text-muted hover:text-foreground" : "text-emerald-600"}`}>
                {s.isActive ? "Deaktiviraj" : "Aktiviraj"}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
