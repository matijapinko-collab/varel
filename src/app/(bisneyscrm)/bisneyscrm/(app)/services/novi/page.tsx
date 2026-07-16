import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { ServiceForm } from "@/components/bisneyscrm/services/service-form";

export const dynamic = "force-dynamic";

export default async function NewService() {
  await requireBisneysUser();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/services">Usluge</BackLink>
      <BisneysPageHeader title="Nova usluga" />
      <ServiceForm />
    </div>
  );
}
