import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { CandidateForm } from "@/components/bisneyscrm/candidates/candidate-form";

export const dynamic = "force-dynamic";

export default async function NewCandidate() {
  await requireBisneysUser();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/candidates">Kandidati</BackLink>
      <BisneysPageHeader title="Novi kandidat" />
      <CandidateForm />
    </div>
  );
}
