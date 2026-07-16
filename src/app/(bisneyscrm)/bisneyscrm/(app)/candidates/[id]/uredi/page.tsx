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
  const [c, professions] = await Promise.all([
    db.bisneysCandidate.findFirst({ where: { id, deletedAt: null }, include: { person: true } }),
    db.bisneysProfession.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
  ]);
  if (!c) notFound();

  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/candidates/${c.id}`}>{c.person.fullName}</BackLink>
      <BisneysPageHeader title="Uredi kandidata" />
      <CandidateForm
        professions={professions}
        candidate={{
          id: c.id, firstName: c.person.firstName, lastName: c.person.lastName, phone: c.person.phone, email: c.person.email,
          linkedinUrl: c.person.linkedinUrl, city: c.person.city, country: c.person.country, status: c.status, source: c.source, seniority: c.seniority,
          yearsExperience: c.yearsExperience, education: c.education, currentEmployer: c.currentEmployer, currentPosition: c.currentPosition,
          expectedSalary: c.expectedSalary, availability: c.availability, drivingLicense: c.drivingLicense, willingToRelocate: c.willingToRelocate,
          rating: c.rating, notes: c.notes, nextFollowUpAt: iso(c.nextFollowUpAt),
          profileStatus: c.profileStatus, candidateSource: c.candidateSource, primaryProfessionId: c.primaryProfessionId, educationLevel: c.educationLevel,
          availabilityStatus: c.availabilityStatus, availableFrom: iso(c.availableFrom), noticePeriodDays: c.noticePeriodDays, relocationPreference: c.relocationPreference,
          expectedSalaryMin: c.expectedSalaryMin?.toString() ?? null, expectedSalaryMax: c.expectedSalaryMax?.toString() ?? null, salaryCurrency: c.salaryCurrency,
          fieldWorkWilling: c.fieldWorkWilling, internationalField: c.internationalField, multiDayField: c.multiDayField,
          shiftWork: c.shiftWork, nightWork: c.nightWork, heightWork: c.heightWork, physicalWork: c.physicalWork,
        }}
      />
    </div>
  );
}
