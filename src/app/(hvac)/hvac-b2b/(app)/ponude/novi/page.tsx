import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { createQuotation } from "@/server/actions/hvac-quotations";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage(props: PageProps<"/hvac-b2b/ponude/novi">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const preCustomer = typeof sp?.customerId === "string" ? sp.customerId : "";

  const customers = await db.hvacCustomer.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null },
    orderBy: [{ companyName: "asc" }, { lastName: "asc" }], take: 500,
    select: { id: true, type: true, firstName: true, lastName: true, companyName: true },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nova ponuda" />
      <Link href="/hvac-b2b/ponude" className="text-sm text-muted hover:text-foreground">← Ponude</Link>

      {customers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Prvo dodajte klijenta. <Link href="/hvac-b2b/klijenti/novi" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Dodaj klijenta</Link>
        </div>
      ) : (
        <form action={createQuotation} className="mt-4">
          <FormSection title="Podaci ponude">
            <Field label="Klijent">
              <Select name="customerId" defaultValue={preCustomer} required>
                <option value="">— odaberite —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{customerDisplayName(c)}</option>)}
              </Select>
            </Field>
            <Field label="Uvjeti plaćanja" hint="npr. 50% predujam, ostatak po izvršenju">
              <Input name="paymentTerms" />
            </Field>
            <Field label="Napomena za klijenta"><Textarea name="notes" rows={3} /></Field>
            <SubmitButton label="Kreiraj ponudu" />
          </FormSection>
        </form>
      )}
    </div>
  );
}
