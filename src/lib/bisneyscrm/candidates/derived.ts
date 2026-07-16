import "server-only";
import { db } from "@/lib/db";

/**
 * Derived recruitment flags (brief §6/§19/§20) — never stored as permanent
 * booleans; always computed from ContactAttempt / Interview history so a
 * candidate marked "no-show" once isn't stuck that way forever.
 */
export type CandidateFlags = {
  noAnswer: boolean; noAnswerCount: number;
  confirmedInterview: boolean; attendedInterview: boolean;
  lastContactAt: Date | null; lastContactOutcome: string | null;
};

const NO_ANSWER_OUTCOMES = ["NO_ANSWER", "UNREACHABLE", "BUSY"];

export async function computeCandidateFlags(candidateId: string): Promise<CandidateFlags> {
  const [calls, interviews, lastContact] = await Promise.all([
    db.bisneysContactAttempt.findMany({ where: { candidateId, channel: "CALL" }, orderBy: { createdAt: "desc" }, take: 20, select: { outcome: true } }),
    db.bisneysInterview.findMany({ where: { candidateId, deletedAt: null }, select: { status: true, confirmed: true, attended: true } }),
    db.bisneysContactAttempt.findFirst({ where: { candidateId }, orderBy: { createdAt: "desc" }, select: { createdAt: true, outcome: true } }),
  ]);

  const lastCall = calls[0];
  const noAnswer = lastCall ? NO_ANSWER_OUTCOMES.includes(lastCall.outcome ?? "") : false;
  let noAnswerCount = 0;
  for (const c of calls) { if (NO_ANSWER_OUTCOMES.includes(c.outcome ?? "")) noAnswerCount++; else break; }

  return {
    noAnswer, noAnswerCount,
    confirmedInterview: interviews.some((i) => i.status === "CONFIRMED" || i.confirmed),
    attendedInterview: interviews.some((i) => i.status === "COMPLETED" || i.attended === true),
    lastContactAt: lastContact?.createdAt ?? null,
    lastContactOutcome: lastContact?.outcome ?? null,
  };
}
