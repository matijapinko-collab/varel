import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { BisneysModuleStub } from "@/components/bisneyscrm/shared/module-page";

export const dynamic = "force-dynamic";

export default async function UsersAdmin() {
  await requireBisneysSuperadmin();
  return <BisneysModuleStub title="Korisnici" description="Dodavanje korisnika, uloge, deaktivacija i reset zaporki." phase="Faza 2+" />;
}
