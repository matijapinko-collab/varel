import "server-only";
import { db } from "@/lib/db";
import type { BisneysNotificationPriority, BisneysSalesStatus, BisneysCandidateStatus } from "@/generated/prisma/client";

/**
 * Alert rules engine (brief §51). Scans companies/candidates for defined
 * conditions and creates notifications. Idempotent: a notification is only
 * created when no active (UNREAD/READ) one already exists for the same
 * rule + entity, so repeated runs never duplicate.
 */

const OPEN_STATUSES: BisneysSalesStatus[] = ["NEW_LEAD", "QUALIFICATION", "FOLLOW_UP", "PITCH", "MEETING", "NURTURE", "NEGOTIATE"];
const CANDIDATE_TERMINAL: BisneysCandidateStatus[] = ["HIRED", "REJECTED", "CANDIDATE_DECLINED"];

type Hit = { ruleKey: string; title: string; description: string; priority: BisneysNotificationPriority; entityType: string; entityId: string };

function daysAgo(n: number): Date { return new Date(Date.now() - n * 86_400_000); }

export async function runAlerts(): Promise<{ created: number }> {
  const hits: Hit[] = [];

  const [staleLeads, noFollowup, bigStale, notContacted, noJob, staleCand, sentNoFeedback] = await Promise.all([
    db.bisneysCompany.findMany({ where: { deletedAt: null, status: { in: OPEN_STATUSES }, OR: [{ lastActivityAt: { lt: daysAgo(7) } }, { lastActivityAt: null }] }, select: { id: true, name: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null, status: { in: OPEN_STATUSES }, nextFollowUpAt: null }, select: { id: true, name: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null, status: { in: OPEN_STATUSES }, dealValue: { gt: 10000 }, OR: [{ lastActivityAt: { lt: daysAgo(7) } }, { lastActivityAt: null }] }, select: { id: true, name: true } }),
    db.bisneysCandidate.findMany({ where: { deletedAt: null, status: "NEW", createdAt: { lt: daysAgo(3) } }, select: { id: true, person: { select: { fullName: true } } } }),
    db.bisneysCandidate.findMany({ where: { deletedAt: null, status: { notIn: CANDIDATE_TERMINAL }, candidateJobs: { none: {} } }, select: { id: true, person: { select: { fullName: true } } } }),
    db.bisneysCandidate.findMany({ where: { deletedAt: null, status: { notIn: CANDIDATE_TERMINAL }, lastActivityAt: { lt: daysAgo(14) } }, select: { id: true, person: { select: { fullName: true } } } }),
    db.bisneysCandidate.findMany({ where: { deletedAt: null, status: "SENT_TO_CLIENT", OR: [{ lastActivityAt: { lt: daysAgo(7) } }, { lastActivityAt: null }] }, select: { id: true, person: { select: { fullName: true } } } }),
  ]);

  for (const c of staleLeads) hits.push({ ruleKey: "lead_untouched_7d", entityType: "company", entityId: c.id, priority: "HIGH", title: "Lead nije diran 7 dana", description: `${c.name} nema aktivnosti više od 7 dana.` });
  for (const c of noFollowup) hits.push({ ruleKey: "lead_no_followup", entityType: "company", entityId: c.id, priority: "MEDIUM", title: "Lead bez follow-upa", description: `${c.name} nema planirani follow-up.` });
  for (const c of bigStale) hits.push({ ruleKey: "deal_over_10k_stale", entityType: "company", entityId: c.id, priority: "HIGH", title: "Veliki deal bez aktivnosti", description: `${c.name} (deal > 10.000 €) nema nedavne aktivnosti.` });
  for (const c of notContacted) hits.push({ ruleKey: "candidate_not_contacted", entityType: "candidate", entityId: c.id, priority: "MEDIUM", title: "Kandidat nije kontaktiran", description: `${c.person.fullName} je u statusu Novi više od 3 dana.` });
  for (const c of noJob) hits.push({ ruleKey: "candidate_no_job", entityType: "candidate", entityId: c.id, priority: "LOW", title: "Kandidat bez posla", description: `${c.person.fullName} nije povezan ni s jednim poslom.` });
  for (const c of staleCand) hits.push({ ruleKey: "candidate_stale", entityType: "candidate", entityId: c.id, priority: "MEDIUM", title: "Kandidat predugo bez promjene", description: `${c.person.fullName} nema aktivnosti više od 14 dana.` });
  for (const c of sentNoFeedback) hits.push({ ruleKey: "candidate_sent_no_feedback", entityType: "candidate", entityId: c.id, priority: "HIGH", title: "Nema povratne informacije klijenta", description: `${c.person.fullName} je poslan klijentu, ali nema feedbacka.` });

  // Dedupe against existing active notifications.
  const existing = await db.bisneysNotification.findMany({
    where: { status: { in: ["UNREAD", "READ"] }, ruleKey: { not: null } },
    select: { ruleKey: true, entityId: true },
  });
  const seen = new Set(existing.map((e) => `${e.ruleKey}:${e.entityId}`));

  const toCreate = hits.filter((h) => !seen.has(`${h.ruleKey}:${h.entityId}`));
  if (toCreate.length) {
    await db.bisneysNotification.createMany({
      data: toCreate.map((h) => ({ ruleKey: h.ruleKey, title: h.title, description: h.description, priority: h.priority, entityType: h.entityType, entityId: h.entityId })),
    });
  }
  return { created: toCreate.length };
}
