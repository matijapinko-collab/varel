import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { PageHeader } from "@/components/admin/ui";
import { CustomerForm } from "@/components/hvac/b2b/customer-form";
import { updateCustomer } from "@/server/actions/hvac-customers";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage(props: PageProps<"/hvac-b2b/klijenti/[customerId]/uredi">) {
  const ctx = await requireTenantContext();
  const { customerId } = await props.params;
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Uredi klijenta" />
      <Link href={`/hvac-b2b/klijenti/${customerId}`} className="text-sm text-muted hover:text-foreground">← Natrag na klijenta</Link>
      <div className="mt-4"><CustomerForm customer={customer} action={updateCustomer.bind(null, customerId)} submitLabel="Spremi promjene" /></div>
    </div>
  );
}
