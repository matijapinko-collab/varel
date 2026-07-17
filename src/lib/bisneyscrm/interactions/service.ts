import "server-only";
import { db } from "@/lib/db";
import { parseInteraction, type InteractionType } from "./parse";
import type { BisneysInteractionType, Prisma } from "@/generated/prisma/client";

/**
 * Interaction service (Company Intelligence Faza 1). Normalizes Trello comments
 * into BisneysInteraction rows (idempotent by Trello action id) and backfills
 * the ones already stored as BisneysComment. The raw text is always preserved.
 */

export type TrelloCommentInput = {
  externalId: string; // Trello action id
  rawContent: string;
  actorName?: string | null;
  externalActorId?: string | null;
  companyId?: string | null;
  candidateId?: string | null;
  personId?: string | null;
  externalUrl?: string | null;
  occurredAt?: Date | null;
  edited?: boolean;
};

/** Idempotently records (or updates) a Trello comment as a normalized interaction. */
export async function recordTrelloComment(input: TrelloCommentInput): Promise<void> {
  const parsed = parseInteraction(input.rawContent, "TRELLO_COMMENT");
  const data = {
    type: parsed.type as BisneysInteractionType,
    source: "TRELLO" as const,
    rawContent: input.rawContent,
    parsedContactName: parsed.contactName,
    parsingConfidence: parsed.confidence,
    needsReview: parsed.needsReview,
    actorName: input.actorName ?? null,
    externalActorId: input.externalActorId ?? null,
    companyId: input.companyId ?? null,
    candidateId: input.candidateId ?? null,
    personId: input.personId ?? null,
    externalUrl: input.externalUrl ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    edited: input.edited ?? false,
    editedAt: input.edited ? new Date() : null,
  };
  await db.bisneysInteraction.upsert({
    where: { externalId: input.externalId },
    create: { externalId: input.externalId, ...data },
    update: {
      // Re-parse on edit, but never touch the linkage/actor if already set elsewhere.
      rawContent: data.rawContent,
      type: data.type,
      parsedContactName: data.parsedContactName,
      parsingConfidence: data.parsingConfidence,
      needsReview: data.needsReview,
      edited: true,
      editedAt: new Date(),
    },
  });
}

/** Soft-deletes the interaction for a deleted Trello comment. */
export async function deleteTrelloInteraction(externalId: string): Promise<void> {
  await db.bisneysInteraction.updateMany({ where: { externalId }, data: { deletedAt: new Date() } });
}

/** Backfills interactions from existing Trello-sourced comments. Idempotent. */
export async function backfillInteractionsFromComments(): Promise<{ created: number }> {
  const comments = await db.bisneysComment.findMany({
    where: { source: "TRELLO", externalId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 10000,
  });
  let created = 0;
  for (const c of comments) {
    if (!c.externalId) continue;
    const before = await db.bisneysInteraction.findUnique({ where: { externalId: c.externalId }, select: { id: true } });
    await recordTrelloComment({
      externalId: c.externalId,
      rawContent: c.body,
      actorName: c.authorName,
      externalActorId: c.authorMemberId,
      companyId: c.companyId,
      candidateId: c.candidateId,
      personId: c.personId,
      occurredAt: c.createdAt,
    });
    if (!before) created++;
  }
  return { created };
}

export type InteractionFilter = {
  companyId?: string;
  candidateId?: string;
  types?: BisneysInteractionType[];
  source?: "TRELLO" | "BISNEYS_CRM";
  actorName?: string;
};

/** Chronological interactions for a timeline (newest first). */
export async function listInteractions(filter: InteractionFilter, limit = 100) {
  const where: Prisma.BisneysInteractionWhereInput = { deletedAt: null };
  if (filter.companyId) where.companyId = filter.companyId;
  if (filter.candidateId) where.candidateId = filter.candidateId;
  if (filter.types?.length) where.type = { in: filter.types };
  if (filter.source) where.source = filter.source;
  if (filter.actorName) where.actorName = filter.actorName;
  return db.bisneysInteraction.findMany({ where, orderBy: { occurredAt: "desc" }, take: limit });
}

/** Manually recorded interaction (note / logged call / meeting). */
export async function createManualInteraction(input: {
  companyId?: string | null; candidateId?: string | null; personId?: string | null;
  type: InteractionType; rawContent: string; title?: string | null;
  actorUserId?: string | null; actorName?: string | null; occurredAt?: Date | null;
}): Promise<string> {
  const row = await db.bisneysInteraction.create({
    data: {
      type: input.type as BisneysInteractionType,
      source: "BISNEYS_CRM",
      title: input.title ?? null,
      rawContent: input.rawContent,
      companyId: input.companyId ?? null,
      candidateId: input.candidateId ?? null,
      personId: input.personId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
  return row.id;
}
