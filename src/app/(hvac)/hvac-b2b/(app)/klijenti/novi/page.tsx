import Link from "next/link";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { PageHeader } from "@/components/admin/ui";
import { CustomerForm } from "@/components/hvac/b2b/customer-form";
import { createCustomer } from "@/server/actions/hvac-customers";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireTenantContext();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi klijent" />
      <Link href="/hvac-b2b/klijenti" className="text-sm text-muted hover:text-foreground">← Klijenti</Link>
      <div className="mt-4"><CustomerForm action={createCustomer} submitLabel="Spremi klijenta" /></div>
    </div>
  );
}
