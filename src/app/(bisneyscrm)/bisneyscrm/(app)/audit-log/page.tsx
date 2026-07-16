import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { BisneysModuleStub } from "@/components/bisneyscrm/shared/module-page";

export const dynamic = "force-dynamic";

export default async function AuditLog() {
  await requireBisneysSuperadmin();
  return <BisneysModuleStub title="Audit log" description="Zapis prijava, promjena podataka i konfiguracije (samo za čitanje)." phase="Faza 8" />;
}
