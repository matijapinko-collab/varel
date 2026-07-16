import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { BisneysModuleStub } from "@/components/bisneyscrm/shared/module-page";

export const dynamic = "force-dynamic";

export default async function SystemSettings() {
  await requireBisneysSuperadmin();
  return <BisneysModuleStub title="Sistemske postavke" description="Globalne postavke, statusi, vrste odnosa i alert pravila." phase="Faza 7" />;
}
