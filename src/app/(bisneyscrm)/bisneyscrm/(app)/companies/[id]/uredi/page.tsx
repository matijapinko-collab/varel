import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { CompanyForm } from "@/components/bisneyscrm/companies/company-form";

export const dynamic = "force-dynamic";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function EditCompany({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const c = await db.bisneysCompany.findFirst({ where: { id, deletedAt: null } });
  if (!c) notFound();

  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/companies/${c.id}`}>{c.name}</BackLink>
      <BisneysPageHeader title="Uredi tvrtku" />
      <CompanyForm
        company={{
          id: c.id, name: c.name, legalName: c.legalName, oib: c.oib, website: c.website,
          industry: c.industry, size: c.size, country: c.country, city: c.city, address: c.address,
          phone: c.phone, email: c.email, description: c.description, status: c.status, leadSource: c.leadSource,
          dealValue: c.dealValue?.toString() ?? null, currency: c.currency,
          expectedCloseDate: iso(c.expectedCloseDate), closeProbability: c.closeProbability, nextFollowUpAt: iso(c.nextFollowUpAt),
        }}
      />
    </div>
  );
}
