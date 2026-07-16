"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, intOrNull, dateOrNull, decStr, boolOf, normalizeEmail, normalizePhone } from "@/lib/bisneyscrm/forms";
import { CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";
import { PROFILE_STATUS_VALUES, EDUCATION_LEVEL_VALUES, AVAILABILITY_VALUES, RELOCATION_VALUES, CANDIDATE_SOURCE_VALUES } from "@/lib/bisneyscrm/candidates/labels";
import type {
  BisneysCandidateStatus, BisneysCandidateProfileStatus, BisneysEducationLevel,
  BisneysAvailabilityStatus, BisneysRelocationPreference, BisneysCandidateSource,
} from "@/generated/prisma/client";

export type SaveResult = { error?: string };

const validStatus = (v: string): BisneysCandidateStatus =>
  (CANDIDATE_STATUS_VALUES as string[]).includes(v) ? (v as BisneysCandidateStatus) : "NEW";
function enumOf<T extends string>(values: readonly string[], v: string): T | null {
  return values.includes(v) ? (v as T) : null;
}

export async function saveCandidate(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const id = opt(form.get("id"));
  const firstName = opt(form.get("firstName"));
  const lastName = opt(form.get("lastName"));
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!fullName) return { error: "Ime i prezime kandidata su obavezni." };

  const status = validStatus(str(form.get("status")));
  const statusNote = opt(form.get("statusNote"));

  const email = opt(form.get("email"));
  const phone = opt(form.get("phone"));
  const personData = {
    firstName, lastName, fullName, phone, email,
    normalizedEmail: normalizeEmail(email),
    normalizedPhone: normalizePhone(phone),
    linkedinUrl: opt(form.get("linkedinUrl")),
    city: opt(form.get("city")),
    country: opt(form.get("country")),
  };
  const candidateData = {
    status,
    source: opt(form.get("source")),
    seniority: opt(form.get("seniority")),
    yearsExperience: intOrNull(form.get("yearsExperience")),
    education: opt(form.get("education")),
    currentEmployer: opt(form.get("currentEmployer")),
    currentPosition: opt(form.get("currentPosition")),
    expectedSalary: opt(form.get("expectedSalary")),
    availability: opt(form.get("availability")),
    drivingLicense: opt(form.get("drivingLicense")),
    willingToRelocate: boolOf(form.get("willingToRelocate")),
    rating: intOrNull(form.get("rating")),
    notes: opt(form.get("notes")),
    nextFollowUpAt: dateOrNull(form.get("nextFollowUpAt")),
    // --- CandidateProfile (Faza 2/3) ---
    profileStatus: (enumOf<BisneysCandidateProfileStatus>(PROFILE_STATUS_VALUES, str(form.get("profileStatus"))) ?? "ACTIVE") as BisneysCandidateProfileStatus,
    candidateSource: enumOf<BisneysCandidateSource>(CANDIDATE_SOURCE_VALUES, str(form.get("candidateSource"))),
    educationLevel: enumOf<BisneysEducationLevel>(EDUCATION_LEVEL_VALUES, str(form.get("educationLevel"))),
    availabilityStatus: enumOf<BisneysAvailabilityStatus>(AVAILABILITY_VALUES, str(form.get("availabilityStatus"))),
    availableFrom: dateOrNull(form.get("availableFrom")),
    noticePeriodDays: intOrNull(form.get("noticePeriodDays")),
    relocationPreference: enumOf<BisneysRelocationPreference>(RELOCATION_VALUES, str(form.get("relocationPreference"))),
    expectedSalaryMin: decStr(form.get("expectedSalaryMin")),
    expectedSalaryMax: decStr(form.get("expectedSalaryMax")),
    salaryCurrency: opt(form.get("salaryCurrency")) ?? "EUR",
    primaryProfessionId: opt(form.get("primaryProfessionId")),
    fieldWorkWilling: boolOf(form.get("fieldWorkWilling")),
    internationalField: boolOf(form.get("internationalField")),
    multiDayField: boolOf(form.get("multiDayField")),
    shiftWork: boolOf(form.get("shiftWork")),
    nightWork: boolOf(form.get("nightWork")),
    heightWork: boolOf(form.get("heightWork")),
    physicalWork: boolOf(form.get("physicalWork")),
  };

  let candidateId: string;
  if (id) {
    const existing = await db.bisneysCandidate.findUnique({ where: { id }, select: { personId: true, status: true } });
    if (!existing) return { error: "Kandidat nije pronađen." };
    await db.bisneysPerson.update({ where: { id: existing.personId }, data: personData });
    await db.bisneysCandidate.update({ where: { id }, data: { ...candidateData, lastActivityAt: new Date() } });
    candidateId = id;

    if (existing.status !== status) {
      await db.bisneysCandidateStatusHistory.create({
        data: { candidateId, fromStatus: existing.status, toStatus: status, changedById: user.id, note: statusNote, source: "BISNEYS_CRM" },
      });
      await db.bisneysActivity.create({
        data: { type: "CANDIDATE_STATUS_CHANGED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, oldValue: existing.status, newValue: status },
      });
    }
    await bisneysAudit({ userId: user.id, action: "candidate_updated", entityType: "candidate", entityId: candidateId, after: { fullName } });
  } else {
    const person = await db.bisneysPerson.create({ data: { ...personData, source: candidateData.source, createdById: user.id } });
    const created = await db.bisneysCandidate.create({
      data: { ...candidateData, personId: person.id, recruiterId: user.id, enteredAt: new Date(), lastActivityAt: new Date() },
    });
    candidateId = created.id;
    await db.bisneysActivity.create({
      data: { type: "CANDIDATE_CREATED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, newValue: fullName },
    });
    await bisneysAudit({ userId: user.id, action: "candidate_created", entityType: "candidate", entityId: candidateId, after: { fullName } });
  }

  // Sync primary profession link (isPrimary) with the CandidateProfession table.
  if (candidateData.primaryProfessionId) {
    await db.bisneysCandidateProfession.updateMany({ where: { candidateId }, data: { isPrimary: false } });
    const link = await db.bisneysCandidateProfession.findFirst({ where: { candidateId, professionId: candidateData.primaryProfessionId } });
    if (link) await db.bisneysCandidateProfession.update({ where: { id: link.id }, data: { isPrimary: true } });
    else await db.bisneysCandidateProfession.create({ data: { candidateId, professionId: candidateData.primaryProfessionId, isPrimary: true } });
  }

  redirect(`/bisneyscrm/candidates/${candidateId}`);
}

/** Link a candidate to a job (brief §68: candidates ↔ jobs). */
export async function linkCandidateToJob(candidateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const jobId = str(form.get("jobId"));
  if (!jobId) redirect(`/bisneyscrm/candidates/${candidateId}`);
  const exists = await db.bisneysCandidateJob.findFirst({ where: { candidateId, jobId } });
  if (!exists) {
    await db.bisneysCandidateJob.create({ data: { candidateId, jobId, stage: "linked" } });
    await bisneysAudit({ userId: user.id, action: "candidate_linked_to_job", entityType: "candidate", entityId: candidateId, after: { jobId } });
  }
  redirect(`/bisneyscrm/candidates/${candidateId}`);
}

export async function archiveCandidate(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysCandidate.update({ where: { id }, data: { deletedAt: new Date(), deletedById: user.id } });
  await bisneysAudit({ userId: user.id, action: "candidate_archived", entityType: "candidate", entityId: id });
  redirect("/bisneyscrm/candidates");
}
