import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantRole, MANAGE_ROLES } from "@/lib/hvac/tenant";
import { PageHeader, Field, Input, Checkbox, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { saveCompany, saveWorkingHours } from "@/server/actions/hvac-b2b";

export const dynamic = "force-dynamic";

const WEEK: { key: string; label: string; defOn: boolean }[] = [
  { key: "mon", label: "Ponedjeljak", defOn: true }, { key: "tue", label: "Utorak", defOn: true },
  { key: "wed", label: "Srijeda", defOn: true }, { key: "thu", label: "Četvrtak", defOn: true },
  { key: "fri", label: "Petak", defOn: true }, { key: "sat", label: "Subota", defOn: false },
  { key: "sun", label: "Nedjelja", defOn: false },
];

export default async function CompanySettingsPage() {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId } });
  const hours = (settings?.workingHoursJson ?? {}) as Record<string, { enabled?: boolean; start?: string; end?: string }>;
  const c = ctx.tenant;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Postavke tvrtke" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <form action={saveCompany} className="mt-4">
        <FormSection title="Podaci o tvrtki">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Naziv tvrtke"><Input name="name" defaultValue={c.name} required /></Field>
            <Field label="OIB"><Input name="oib" defaultValue={c.oib ?? ""} inputMode="numeric" maxLength={11} /></Field>
            <Field label="Pravni oblik"><Input name="legalForm" defaultValue={c.legalForm ?? ""} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={c.phone ?? ""} /></Field>
            <Field label="Adresa"><Input name="address" defaultValue={c.address ?? ""} /></Field>
            <Field label="Grad"><Input name="city" defaultValue={c.city ?? ""} /></Field>
            <Field label="Poštanski broj"><Input name="postalCode" defaultValue={c.postalCode ?? ""} /></Field>
            <Field label="Poslovni e-mail"><Input name="email" type="email" defaultValue={c.email ?? ""} /></Field>
            <Field label="Web-stranica"><Input name="website" defaultValue={c.website ?? ""} /></Field>
            <Field label="Logo (URL)"><Input name="logoUrl" defaultValue={c.logoUrl ?? ""} /></Field>
          </div>
          <Field label="Podnožje dokumenata"><Textarea name="documentFooter" rows={2} defaultValue={c.documentFooter ?? ""} /></Field>
          <Checkbox name="vatRegistered" label="Tvrtka je u sustavu PDV-a" defaultChecked={c.vatRegistered} />
          <SubmitButton label="Spremi podatke" />
        </FormSection>
      </form>

      <form action={saveWorkingHours} className="mt-6">
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
          <SubmitButton label="Spremi radno vrijeme" />
        </FormSection>
      </form>
    </div>
  );
}
