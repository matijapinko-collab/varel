import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantRole, MANAGE_ROLES } from "@/lib/hvac/tenant";
import { PageHeader, Field, Input, Checkbox, SubmitButton, FormSection } from "@/components/admin/ui";
import { saveBookingSettings } from "@/server/actions/hvac-b2b";

export const dynamic = "force-dynamic";

export default async function BookingSettingsPage() {
  const ctx = await requireTenantRole(MANAGE_ROLES);
  const b = await db.hvacBookingSettings.findUnique({ where: { tenantId: ctx.tenantId } });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";
  const soloOnly = ctx.tenant.plan === "SOLO";

  return (
    <div className="max-w-2xl">
      <PageHeader title="Booking" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <div className="mt-4 rounded-lg border border-border bg-background-secondary p-3 text-sm">
        Javna booking stranica: <a href={`${site}/hvac-booking/${ctx.tenant.slug}`} target="_blank" rel="noopener" className="font-mono text-sky-600 hover:underline dark:text-sky-300">{site.replace(/^https?:\/\//, "")}/hvac-booking/{ctx.tenant.slug}</a>
      </div>

      <form action={saveBookingSettings} className="mt-4">
        <FormSection title="Postavke bookinga">
          <Checkbox name="enabled" label="Omogući online booking" defaultChecked={b?.enabled ?? false} />
          <Checkbox name="autoConfirm" label="Automatska potvrda termina (kad je moguće)" defaultChecked={b?.autoConfirm ?? false} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Min. najava (h)"><Input name="minNoticeHours" type="number" defaultValue={b?.minNoticeHours ?? 24} /></Field>
            <Field label="Horizont (dana)"><Input name="horizonDays" type="number" defaultValue={b?.horizonDays ?? 60} /></Field>
            <Field label="Buffer (min)"><Input name="bufferMin" type="number" defaultValue={b?.bufferMin ?? 15} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Područje rada"><Input name="serviceArea" defaultValue={b?.serviceArea ?? ""} /></Field>
            <Field label="Javni telefon"><Input name="publicPhone" defaultValue={b?.publicPhone ?? ""} /></Field>
            <Field label="Javni e-mail"><Input name="publicEmail" type="email" defaultValue={b?.publicEmail ?? ""} /></Field>
          </div>
          <SubmitButton label="Spremi postavke" />
        </FormSection>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Integracija u web-stranicu</h2>
        {soloOnly ? (
          <p className="mt-2 text-sm text-muted">
            Solo paket uključuje booking isključivo kroz Varel web-aplikaciju. Integracija u WordPress ili vlastitu web-stranicu dostupna je u paketima Team i Business.
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            WordPress plugin i ugradnja u web-stranicu <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Uskoro dostupno</span>
          </div>
        )}
      </div>
    </div>
  );
}
