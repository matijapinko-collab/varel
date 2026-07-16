import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { PersonForm } from "@/components/bisneyscrm/people/person-form";

export const dynamic = "force-dynamic";

export default async function NewPerson() {
  await requireBisneysUser();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/people">Osobe</BackLink>
      <BisneysPageHeader title="Nova osoba" />
      <PersonForm />
    </div>
  );
}
