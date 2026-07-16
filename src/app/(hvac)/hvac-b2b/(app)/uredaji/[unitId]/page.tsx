import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName, UNIT_TYPE_LABELS, UNIT_STATUS, TONE_CLASS } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { updateUnit } from "@/server/actions/hvac-customers";
import type { HvacUnitType, HvacUnitStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function dv(d: Date | null | undefined) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }

export default async function UnitProfilePage(props: PageProps<"/hvac-b2b/uredaji/[unitId]">) {
  const ctx = await requireTenantContext();
  const { unitId } = await props.params;
  const u = await db.hvacUnit.findFirst({
    where: { id: unitId, tenantId: ctx.tenantId },
    include: { customer: true, location: true },
  });
  if (!u) notFound();

  const title = [u.manufacturer, u.model].filter(Boolean).join(" ") || u.internalName || "Klima-uređaj";

  return (
    <div className="max-w-3xl">
      <PageHeader title={title}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[UNIT_STATUS[u.status].tone]}`}>{UNIT_STATUS[u.status].label}</span>
      </PageHeader>
      <div className="flex flex-wrap gap-3 text-sm text-muted">
        <Link href="/hvac-b2b/uredaji" className="hover:text-foreground">← Uređaji</Link>
        <Link href={`/hvac-b2b/klijenti/${u.customerId}`} className="hover:text-foreground">{customerDisplayName(u.customer)}</Link>
        {u.location && <span>· {u.location.name}</span>}
      </div>

      <form action={updateUnit.bind(null, unitId)} className="mt-4">
        <FormSection title="Podaci o uređaju">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Interni naziv"><Input name="internalName" defaultValue={u.internalName ?? ""} /></Field>
            <Field label="Vrsta"><Select name="unitType" defaultValue={u.unitType}>{(Object.keys(UNIT_TYPE_LABELS) as HvacUnitType[]).map((k) => <option key={k} value={k}>{UNIT_TYPE_LABELS[k]}</option>)}</Select></Field>
            <Field label="Proizvođač"><Input name="manufacturer" defaultValue={u.manufacturer ?? ""} /></Field>
            <Field label="Model"><Input name="model" defaultValue={u.model ?? ""} /></Field>
            <Field label="Serijski broj"><Input name="serialNumber" defaultValue={u.serialNumber ?? ""} /></Field>
            <Field label="Prostorija"><Input name="room" defaultValue={u.room ?? ""} /></Field>
            <Field label="Snaga (kW)"><Input name="nominalPowerKw" type="number" step="0.1" defaultValue={u.nominalPowerKw ?? ""} /></Field>
            <Field label="Rashladno sredstvo"><Input name="refrigerant" defaultValue={u.refrigerant ?? ""} placeholder="R32, R410A…" /></Field>
            <Field label="Datum montaže"><Input name="installationDate" type="date" defaultValue={dv(u.installationDate)} /></Field>
            <Field label="Godina proizvodnje"><Input name="manufactureYear" type="number" defaultValue={u.manufactureYear ?? ""} /></Field>
            <Field label="Jamstvo od"><Input name="warrantyStart" type="date" defaultValue={dv(u.warrantyStart)} /></Field>
            <Field label="Jamstvo do"><Input name="warrantyEnd" type="date" defaultValue={dv(u.warrantyEnd)} /></Field>
            <Field label="Status"><Select name="status" defaultValue={u.status}>{(Object.keys(UNIT_STATUS) as HvacUnitStatus[]).map((k) => <option key={k} value={k}>{UNIT_STATUS[k].label}</option>)}</Select></Field>
            <Field label="Sljedeći preporučeni servis"><Input name="nextServiceDate" type="date" defaultValue={dv(u.nextServiceDate)} /></Field>
          </div>
          <Field label="Napomene"><Textarea name="notes" rows={2} defaultValue={u.notes ?? ""} /></Field>
          <SubmitButton label="Spremi uređaj" />
        </FormSection>
      </form>

      <FormSection title="Servisna povijest">
        <p className="text-sm text-muted">Radni nalozi i servisi za ovaj uređaj prikazat će se ovdje. Modul radnih naloga dolazi u sljedećoj fazi.</p>
      </FormSection>
    </div>
  );
}
