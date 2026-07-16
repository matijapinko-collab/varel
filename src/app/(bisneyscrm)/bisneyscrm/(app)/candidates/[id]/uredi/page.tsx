import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { CandidateForm } from "@/components/bisneyscrm/candidates/candidate-form";

export const dynamic = "force-dynamic";
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function EditCandidate({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const c = await db.bisneysCandidate.findFirst({ where: { id, deletedAt: null }, include: { person: true } });
  if (!c) notFound();

  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/candidates/${c.id}`}>{c.person.fullName}</BackLink>
      <BisneysPageHeader title="Uredi kandidata" />
      <CandidateForm
        candidate={{
          id: c.id, firstName: c.person.firstName, lastName: c.person.lastName, phone: c.person.phone, email: c.person.email,
          city: c.person.city, country: c.person.country, status: c.status, source: c.source, seniority: c.seniority,
          yearsExperience: c.yearsExperience, education: c.education, currentEmployer: c.currentEmployer, currentPosition: c.currentPosition,
          expectedSalary: c.expectedSalary, availability: c.availability, drivingLicense: c.drivingLicense, willingToRelocate: c.willingToRelocate,
          rating: c.rating, notes: c.notes, nextFollowUpAt: iso(c.nextFollowUpAt),
        }}
      />
    </div>
  );
}
