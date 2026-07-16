import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { JobForm } from "@/components/bisneyscrm/jobs/job-form";

export const dynamic = "force-dynamic";

export default async function NewJob() {
  await requireBisneysUser();
  const companies = await db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/jobs">Poslovi</BackLink>
      <BisneysPageHeader title="Novi posao" />
      <JobForm companies={companies} />
    </div>
  );
}
