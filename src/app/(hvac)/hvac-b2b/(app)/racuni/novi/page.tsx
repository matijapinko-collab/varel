import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Select, SubmitButton, FormSection } from "@/components/admin/ui";
import { createInvoice } from "@/server/actions/hvac-invoices";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage(props: PageProps<"/hvac-b2b/racuni/novi">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const preCustomer = typeof sp?.customerId === "string" ? sp.customerId : "";
  const preWorkOrder = typeof sp?.workOrderId === "string" ? sp.workOrderId : "";

  const customers = await db.hvacCustomer.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null },
    orderBy: [{ companyName: "asc" }, { lastName: "asc" }], take: 500,
    select: { id: true, type: true, firstName: true, lastName: true, companyName: true },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi račun" />
      <Link href="/hvac-b2b/racuni" className="text-sm text-muted hover:text-foreground">← Računi</Link>

      {customers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Prvo dodajte klijenta. <Link href="/hvac-b2b/klijenti/novi" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Dodaj klijenta</Link>
        </div>
      ) : (
        <form action={createInvoice} className="mt-4">
          {preWorkOrder && <input type="hidden" name="workOrderId" value={preWorkOrder} />}
          <FormSection title="Podaci računa">
            <Field label="Klijent">
              <Select name="customerId" defaultValue={preCustomer} required={!preWorkOrder} disabled={!!preWorkOrder}>
                <option value="">— odaberite —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{customerDisplayName(c)}</option>)}
              </Select>
            </Field>
            {preWorkOrder && <p className="text-xs text-muted">Klijent i stavke preuzet će se iz radnog naloga.</p>}
            <SubmitButton label="Kreiraj račun" />
          </FormSection>
        </form>
      )}
    </div>
  );
}
