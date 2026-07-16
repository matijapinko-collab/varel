import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, AirVent, Pencil, Archive } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName, CUSTOMER_TYPE_LABELS, SOURCE_LABELS, UNIT_TYPE_LABELS, UNIT_STATUS } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { createLocation, createUnit, archiveCustomer, restoreCustomer } from "@/server/actions/hvac-customers";
import type { HvacUnitType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage(props: PageProps<"/hvac-b2b/klijenti/[customerId]">) {
  const ctx = await requireTenantContext();
  const { customerId } = await props.params;

  const customer = await db.hvacCustomer.findFirst({
    where: { id: customerId, tenantId: ctx.tenantId },
    include: {
      locations: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      units: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { location: { select: { name: true } } } },
    },
  });
  if (!customer) notFound();

  const activity = await db.hvacActivityLog.findMany({
    where: { tenantId: ctx.tenantId, entityId: customerId },
    orderBy: { createdAt: "desc" }, take: 8,
  });

  const name = customerDisplayName(customer);

  return (
    <div className="max-w-4xl">
      <PageHeader title={name}>
        <Link href={`/hvac-b2b/klijenti/${customerId}/uredi`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-sky-500/50"><Pencil size={14} /> Uredi</Link>
        {customer.archivedAt ? (
          <form action={restoreCustomer.bind(null, customerId)}><button className="rounded-lg border border-border px-3 py-1.5 text-sm">Vrati iz arhive</button></form>
        ) : (
          <form action={archiveCustomer.bind(null, customerId)}><button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-red-500"><Archive size={14} /> Arhiviraj</button></form>
        )}
      </PageHeader>
      <Link href="/hvac-b2b/klijenti" className="text-sm text-muted hover:text-foreground">← Klijenti</Link>

      {customer.archivedAt && <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-sm text-amber-700 dark:text-amber-300">Klijent je arhiviran.</div>}

      {/* Details */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <dl className="space-y-1.5">
            <Row k="Vrsta">{CUSTOMER_TYPE_LABELS[customer.type]}</Row>
            {customer.oib && <Row k="OIB">{customer.oib}</Row>}
            <Row k="Telefon">{customer.phone ?? "—"}</Row>
            <Row k="E-mail">{customer.email ?? "—"}</Row>
            <Row k="Izvor">{SOURCE_LABELS[customer.source]}</Row>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <dl className="space-y-1.5">
            <Row k="Adresa">{customer.billingAddress ?? "—"}</Row>
            <Row k="Grad">{[customer.billingPostalCode, customer.billingCity].filter(Boolean).join(" ") || "—"}</Row>
          </dl>
          {customer.notes && <p className="mt-2 border-t border-border pt-2 text-muted">{customer.notes}</p>}
        </div>
      </div>

      {/* Locations */}
      <FormSection title="Lokacije">
        {customer.locations.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {customer.locations.map((l) => (
              <li key={l.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                <MapPin size={15} className="mt-0.5 shrink-0 text-sky-500" />
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted">{[l.address, l.postalCode, l.city].filter(Boolean).join(", ") || "—"}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Još nema lokacija.</p>}

        <details className="mt-3 rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Dodaj lokaciju</summary>
          <form action={createLocation.bind(null, customerId)} className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
            <Field label="Naziv lokacije"><Input name="name" placeholder="Kuća, Ured…" /></Field>
            <Field label="Adresa"><Input name="address" /></Field>
            <Field label="Grad"><Input name="city" /></Field>
            <Field label="Poštanski broj"><Input name="postalCode" /></Field>
            <Field label="Kontakt osoba"><Input name="contactPerson" /></Field>
            <Field label="Kontakt telefon"><Input name="contactPhone" /></Field>
            <div className="sm:col-span-2"><Field label="Upute za pristup / parking"><Textarea name="accessInstructions" rows={2} /></Field></div>
            <div className="sm:col-span-2"><SubmitButton label="Dodaj lokaciju" /></div>
          </form>
        </details>
      </FormSection>

      {/* Devices */}
      <FormSection title="Klima-uređaji">
        {customer.units.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {customer.units.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <Link href={`/hvac-b2b/uredaji/${u.id}`} className="flex min-w-0 items-center gap-2 hover:text-sky-600 dark:hover:text-sky-300">
                  <AirVent size={15} className="shrink-0 text-sky-500" />
                  <span className="truncate">{[u.manufacturer, u.model].filter(Boolean).join(" ") || u.internalName || "Uređaj"}</span>
                </Link>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-muted">{u.location?.name}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${UNIT_STATUS[u.status].tone === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-400/10 text-slate-500"}`}>{UNIT_STATUS[u.status].label}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Još nema uređaja.</p>}

        {customer.locations.length > 0 ? (
          <details className="mt-3 rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Dodaj klima-uređaj</summary>
            <form action={createUnit.bind(null, customerId)} className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
              <Field label="Lokacija"><Select name="locationId">{customer.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
              <Field label="Vrsta"><Select name="unitType" defaultValue="SPLIT">{(Object.keys(UNIT_TYPE_LABELS) as HvacUnitType[]).map((k) => <option key={k} value={k}>{UNIT_TYPE_LABELS[k]}</option>)}</Select></Field>
              <Field label="Proizvođač"><Input name="manufacturer" placeholder="Daikin, Mitsubishi…" /></Field>
              <Field label="Model"><Input name="model" /></Field>
              <Field label="Serijski broj"><Input name="serialNumber" /></Field>
              <Field label="Prostorija"><Input name="room" /></Field>
              <Field label="Datum montaže"><Input name="installationDate" type="date" /></Field>
              <Field label="Sljedeći servis"><Input name="nextServiceDate" type="date" /></Field>
              <div className="sm:col-span-2"><SubmitButton label="Dodaj uređaj" /></div>
            </form>
          </details>
        ) : <p className="mt-2 text-xs text-muted">Dodajte lokaciju prije uređaja.</p>}
      </FormSection>

      {/* Timeline */}
      {activity.length > 0 && (
        <FormSection title="Aktivnost">
          <ul className="space-y-2 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span className="text-foreground">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                <span className="text-xs">· {a.createdAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </FormSection>
      )}
    </div>
  );
}

const ACTIVITY_LABEL: Record<string, string> = {
  customer_created: "Klijent kreiran",
  customer_updated: "Klijent ažuriran",
  location_created: "Lokacija dodana",
  unit_created: "Uređaj dodan",
  customer_archived: "Klijent arhiviran",
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
