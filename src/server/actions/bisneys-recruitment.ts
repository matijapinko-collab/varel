"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, dateOrNull } from "@/lib/bisneyscrm/forms";
import {
  APPLICATION_STATUS_VALUES, INTERVIEW_TYPE_VALUES, CONTACT_CHANNEL_VALUES, CONTACT_OUTCOME_VALUES,
} from "@/lib/bisneyscrm/candidates/labels";
import type {
  BisneysApplicationStatus, BisneysInterviewType, BisneysInterviewStatus, BisneysContactChannel, BisneysContactOutcome,
} from "@/generated/prisma/client";

const enumOf = <T extends string>(vals: readonly string[], v: string, fb: T): T => (vals.includes(v) ? (v as T) : fb);
const back = (candidateId: string) => redirect(`/bisneyscrm/candidates/${candidateId}`);

/* ---------------- applications (brief §17) ---------------- */

export async function addApplication(candidateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const status = enumOf<BisneysApplicationStatus>(APPLICATION_STATUS_VALUES, str(form.get("status")), "NEW");
  const app = await db.bisneysCandidateApplication.create({
    data: {
      candidateId, jobId: opt(form.get("jobId")), source: null, recruiterId: user.id, status,
      note: opt(form.get("note")), appliedAt: dateOrNull(form.get("appliedAt")) ?? new Date(), createdById: user.id,
    },
  });
  await db.bisneysApplicationStatusHistory.create({ data: { applicationId: app.id, toStatus: status, changedById: user.id } });
  await db.bisneysActivity.create({ data: { type: "CANDIDATE_UPDATED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, jobId: app.jobId, newValue: `Prijava: ${status}` } });
  await bisneysAudit({ userId: user.id, action: "application_created", entityType: "application", entityId: app.id, after: { candidateId, status } });
  back(candidateId);
}

export async function changeApplicationStatus(applicationId: string, candidateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const app = await db.bisneysCandidateApplication.findUnique({ where: { id: applicationId }, select: { status: true } });
  if (!app) back(candidateId);
  const status = enumOf<BisneysApplicationStatus>(APPLICATION_STATUS_VALUES, str(form.get("status")), "NEW");
  const reason = opt(form.get("reason"));
  await db.bisneysCandidateApplication.update({ where: { id: applicationId }, data: { status, statusReason: reason, ...(status === "REJECTED" ? { rejectionReason: reason } : {}), ...(["HIRED", "REJECTED", "WITHDRAWN", "CLOSED"].includes(status) ? { closedAt: new Date() } : {}) } });
  await db.bisneysApplicationStatusHistory.create({ data: { applicationId, fromStatus: app!.status, toStatus: status, changedById: user.id, note: reason } });
  await db.bisneysActivity.create({ data: { type: "CANDIDATE_STATUS_CHANGED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, oldValue: app!.status, newValue: status } });
  await bisneysAudit({ userId: user.id, action: "application_status_changed", entityType: "application", entityId: applicationId, before: { status: app!.status }, after: { status } });
  back(candidateId);
}

/* ---------------- contact attempts (brief §19) ---------------- */

export async function addContactAttempt(candidateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const channel = enumOf<BisneysContactChannel>(CONTACT_CHANNEL_VALUES, str(form.get("channel")), "CALL");
  const outcomeRaw = str(form.get("outcome"));
  const outcome = (CONTACT_OUTCOME_VALUES as string[]).includes(outcomeRaw) ? (outcomeRaw as BisneysContactOutcome) : null;
  await db.bisneysContactAttempt.create({
    data: { candidateId, channel, outcome, byUserId: user.id, note: opt(form.get("note")), nextStep: opt(form.get("nextStep")), followUpAt: dateOrNull(form.get("followUpAt")) },
  });
  await db.bisneysCandidate.update({ where: { id: candidateId }, data: { lastActivityAt: new Date(), firstContactAt: undefined } }).catch(() => {});
  await db.bisneysActivity.create({ data: { type: "CALL_LOGGED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, newValue: outcome ?? channel } });
  await bisneysAudit({ userId: user.id, action: "contact_attempt_added", entityType: "candidate", entityId: candidateId, after: { channel, outcome } });
  back(candidateId);
}

/* ---------------- interviews (brief §20) ---------------- */

export async function scheduleInterview(candidateId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const type = enumOf<BisneysInterviewType>(INTERVIEW_TYPE_VALUES, str(form.get("type")), "PHONE_SCREEN");
  const iv = await db.bisneysInterview.create({
    data: { candidateId, jobId: opt(form.get("jobId")), type, status: "SCHEDULED", scheduledAt: dateOrNull(form.get("scheduledAt")), locationOrLink: opt(form.get("locationOrLink")), recruiterId: user.id },
  });
  await db.bisneysInterviewStatusHistory.create({ data: { interviewId: iv.id, toStatus: "SCHEDULED", changedById: user.id } });
  await db.bisneysActivity.create({ data: { type: "MEETING_SCHEDULED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, newValue: type } });
  await bisneysAudit({ userId: user.id, action: "interview_scheduled", entityType: "interview", entityId: iv.id, after: { candidateId, type } });
  back(candidateId);
}

/** Quick interview actions (brief §20): confirm / no-show / attended / complete / cancel. */
export async function interviewAction(interviewId: string, candidateId: string, action: string): Promise<void> {
  const user = await requireBisneysUser();
  const iv = await db.bisneysInterview.findUnique({ where: { id: interviewId }, select: { status: true } });
  if (!iv) back(candidateId);
  const map: Record<string, { status: BisneysInterviewStatus; data: Record<string, unknown> }> = {
    confirm: { status: "CONFIRMED", data: { confirmed: true, confirmedAt: new Date() } },
    attended: { status: "COMPLETED", data: { attended: true, arrivedAt: new Date() } },
    noshow: { status: "NO_SHOW", data: { attended: false } },
    complete: { status: "COMPLETED", data: {} },
    cancel: { status: "CANCELLED", data: {} },
  };
  const m = map[action];
  if (m) {
    await db.bisneysInterview.update({ where: { id: interviewId }, data: { status: m.status, ...m.data } });
    await db.bisneysInterviewStatusHistory.create({ data: { interviewId, fromStatus: iv!.status, toStatus: m.status, changedById: user.id } });
    await db.bisneysActivity.create({ data: { type: m.status === "COMPLETED" ? "MEETING_COMPLETED" : "MEETING_SCHEDULED", source: "BISNEYS_CRM", actorName: user.username, actorUserId: user.id, entityType: "CANDIDATE", entityId: candidateId, candidateId, oldValue: iv!.status, newValue: m.status } });
    await bisneysAudit({ userId: user.id, action: `interview_${action}`, entityType: "interview", entityId: interviewId, after: { status: m.status } });
  }
  back(candidateId);
}
