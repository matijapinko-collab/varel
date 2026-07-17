import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { ImportWizard } from "@/components/bisneyscrm/candidates/import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportCandidatesPage() {
  await requireBisneysUser();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/candidates">Kandidati</BackLink>
      <BisneysPageHeader title="Uvoz kandidata" description="CSV/TSV uvoz s mapiranjem stupaca i detekcijom duplikata." />
      <ImportWizard />
    </div>
  );
}
