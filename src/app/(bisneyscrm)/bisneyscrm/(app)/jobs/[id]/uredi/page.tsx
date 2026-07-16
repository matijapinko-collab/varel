import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { JobForm } from "@/components/bisneyscrm/jobs/job-form";

export const dynamic = "force-dynamic";
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const [j, companies] = await Promise.all([
    db.bisneysJob.findFirst({ where: { id, deletedAt: null }, include: { profession: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
  ]);
  if (!j) notFound();
  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/jobs/${j.id}`}>{j.title}</BackLink>
      <BisneysPageHeader title="Uredi posao" />
      <JobForm
        companies={companies}
        job={{ id: j.id, title: j.title, professionName: j.profession?.name ?? null, companyId: j.companyId, location: j.location, headcount: j.headcount, salary: j.salary, currency: j.currency, contractType: j.contractType, startDate: iso(j.startDate), status: j.status, description: j.description, requirements: j.requirements, languages: j.languages, licenses: j.licenses }}
      />
    </div>
  );
}
