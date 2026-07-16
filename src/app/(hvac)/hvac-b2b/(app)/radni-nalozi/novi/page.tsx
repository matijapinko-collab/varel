import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName, PRIORITY } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { createWorkOrder } from "@/server/actions/hvac-workorders";
import type { HvacPriority } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage(props: PageProps<"/hvac-b2b/radni-nalozi/novi">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const preCustomer = typeof sp?.customerId === "string" ? sp.customerId : "";

  const [customers, technicians, services] = await Promise.all([
    db.hvacCustomer.findMany({ where: { tenantId: ctx.tenantId, archivedAt: null }, orderBy: [{ companyName: "asc" }, { lastName: "asc" }], take: 500, select: { id: true, type: true, firstName: true, lastName: true, companyName: true } }),
    db.hvacTechnician.findMany({ where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.hvacService.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi radni nalog" />
      <Link href="/hvac-b2b/radni-nalozi" className="text-sm text-muted hover:text-foreground">← Radni nalozi</Link>

      {customers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Prvo dodajte klijenta. <Link href="/hvac-b2b/klijenti/novi" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Dodaj klijenta</Link>
        </div>
      ) : (
        <form action={createWorkOrder} className="mt-4">
          <FormSection title="Podaci naloga">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Klijent">
                <Select name="customerId" defaultValue={preCustomer} required>
                  <option value="">— odaberite —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{customerDisplayName(c)}</option>)}
                </Select>
              </Field>
              <Field label="Majstor">
                <Select name="technicianId" defaultValue="">
                  <option value="">Nedodijeljeno</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Field label="Usluga">
                <Select name="serviceId" defaultValue="">
                  <option value="">—</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Prioritet">
                <Select name="priority" defaultValue="NORMAL">
                  {(Object.keys(PRIORITY) as HvacPriority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Opis kvara / zahtjeva"><Textarea name="issueDescription" rows={3} /></Field>
            <SubmitButton label="Kreiraj radni nalog" />
          </FormSection>
        </form>
      )}
    </div>
  );
}
