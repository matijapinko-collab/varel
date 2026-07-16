import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { CompanyForm } from "@/components/bisneyscrm/companies/company-form";

export const dynamic = "force-dynamic";

export default async function NewCompany() {
  await requireBisneysUser();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/companies">Tvrtke</BackLink>
      <BisneysPageHeader title="Nova tvrtka" />
      <CompanyForm />
    </div>
  );
}
