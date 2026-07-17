import "server-only";
import { db } from "@/lib/db";
import type { Prisma, BisneysSalesStatus, BisneysActivityType } from "@/generated/prisma/client";
import { trello, type TrelloActionDto, type TrelloCardDto, type TrelloCreds } from "./client";
import { getConnection, getCreds, setStatus, updateConnection } from "./connection";
import { defaultStatusForListName } from "./mapping";
import { commentActivityType, isCallComment } from "./activities";
import { parseCandidateFromCard, type CandidateLabelMap } from "@/lib/bisneyscrm/import/trello-parse";
import { getCandidateLabelMap, labelNames } from "./candidate-map";
import { normalizeEmail, normalizePhone } from "@/lib/bisneyscrm/forms";
import { CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";
import { recordTrelloComment, deleteTrelloInteraction } from "@/lib/bisneyscrm/interactions/service";

/** Card shape used for candidate parsing (name + description + raw labels). */
type CandidateCard = { id: string; name?: string; desc?: string | null; labelsJson?: unknown };

/**
 * Trello → Bisneys sync (brief §16–18). Pulls board/list/card/member data into
 * the local bisneys_trello_* tables, maps cards onto domain entities
 * (sales board → Company, delivery boards → Candidate; the adapter boundary
 * from brief §4/§67), and normalizes the Trello action history into
 * BisneysActivity. Every action is processed idempotently, keyed by the Trello
 * action id (brief §17: no duplicate events), so initial sync, reconciliation
 * and webhooks can all run the same processor safely.
 */

type BoardKind = "sales" | "delivery";

function actionKind(boardKind: BoardKind) {
  return boardKind === "sales" ? "COMPANY" : "CANDIDATE";
}

/* ---------------- entity mapping (adapter) ---------------- */

async function listMappedStatus(listId: string | null | undefined): Promise<BisneysSalesStatus | null> {
  if (!listId) return null;
  const list = await db.bisneysTrelloList.findUnique({ where: { externalId: listId }, select: { mappedStatus: true } });
  return list?.mappedStatus ?? null;
}

async function ensureCompanyFromCard(card: { id: string; name?: string }, status?: BisneysSalesStatus | null): Promise<string> {
  const existing = await db.bisneysCompany.findFirst({ where: { externalId: card.id }, select: { id: true } });
  if (existing) {
    if (status) await db.bisneysCompany.update({ where: { id: existing.id }, data: { status, lastActivityAt: new Date() } });
    return existing.id;
  }
  const created = await db.bisneysCompany.create({
    data: {
      name: card.name?.trim() || "(bez naziva)",
      status: status ?? "NEW_COMPANY",
      externalId: card.id,
      externalSource: "TRELLO",
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });
  return created.id;
}

const validCandidateStatus = (s: string | null): string | null =>
  s && (CANDIDATE_STATUS_VALUES as string[]).includes(s) ? s : null;

/**
 * Maps a delivery-board Trello card onto a candidate, enriching from the card
 * parser + label map (Faza 10): email/phone from the title/description, tags +
 * profession + pipeline status from mapped labels. On an existing candidate it
 * only fills blanks and merges tags (idempotent — safe to re-run on every sync).
 */
async function ensureCandidateFromCard(card: CandidateCard, labelMap?: CandidateLabelMap): Promise<string> {
  const map = labelMap ?? (await getCandidateLabelMap());
  const parsed = parseCandidateFromCard({ name: card.name ?? "", desc: card.desc, labels: labelNames(card.labelsJson) }, map);
  const mappedStatus = validCandidateStatus(parsed.status);

  const existing = await db.bisneysCandidate.findFirst({
    where: { externalId: card.id },
    select: { id: true, personId: true, tags: true, primaryProfessionId: true },
  });

  if (existing) {
    // Enrich: fill missing contact fields, merge tags, set profession if absent.
    const person = await db.bisneysPerson.findUnique({ where: { id: existing.personId }, select: { email: true, phone: true } });
    const personPatch: Record<string, unknown> = {};
    if (!person?.email && parsed.email) { personPatch.email = parsed.email; personPatch.normalizedEmail = normalizeEmail(parsed.email); }
    if (!person?.phone && parsed.phone) { personPatch.phone = parsed.phone; personPatch.normalizedPhone = normalizePhone(parsed.phone); }
    if (Object.keys(personPatch).length) await db.bisneysPerson.update({ where: { id: existing.personId }, data: personPatch });

    const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...parsed.tags]));
    const candPatch: Record<string, unknown> = { lastSyncedAt: new Date() };
    if (mergedTags.length !== (existing.tags ?? []).length) candPatch.tags = mergedTags;
    if (!existing.primaryProfessionId && parsed.professionId) candPatch.primaryProfessionId = parsed.professionId;
    await db.bisneysCandidate.update({ where: { id: existing.id }, data: candPatch });
    if (!existing.primaryProfessionId && parsed.professionId) {
      await db.bisneysCandidateProfession.create({ data: { candidateId: existing.id, professionId: parsed.professionId, isPrimary: true } }).catch(() => {});
    }
    return existing.id;
  }

  const person = await db.bisneysPerson.create({
    data: {
      fullName: parsed.fullName || card.name?.trim() || "(bez imena)",
      email: parsed.email, normalizedEmail: normalizeEmail(parsed.email),
      phone: parsed.phone, normalizedPhone: normalizePhone(parsed.phone),
      externalId: card.id, externalSource: "TRELLO", source: "TRELLO",
    },
  });
  const created = await db.bisneysCandidate.create({
    data: {
      personId: person.id,
      status: (mappedStatus ?? "NEW") as never,
      candidateSource: "TRELLO",
      primaryProfessionId: parsed.professionId,
      tags: parsed.tags,
      externalId: card.id, externalSource: "TRELLO", syncStatus: "SYNCED", lastSyncedAt: new Date(),
    },
  });
  if (parsed.professionId) {
    await db.bisneysCandidateProfession.create({ data: { candidateId: created.id, professionId: parsed.professionId, isPrimary: true } }).catch(() => {});
  }
  return created.id;
}

/* ---------------- action normalization ---------------- */

/** Claims a Trello action id; returns false if it was already processed. */
async function claimAction(action: TrelloActionDto, boardId: string | null): Promise<boolean> {
  try {
    await db.bisneysTrelloWebhookEvent.create({
      data: {
        externalId: action.id,
        boardId,
        type: action.type,
        payloadJson: action as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    });
    return true;
  } catch {
    return false; // unique violation → already seen
  }
}

async function markProcessed(actionId: string, error?: string): Promise<void> {
  try {
    await db.bisneysTrelloWebhookEvent.updateMany({
      where: { externalId: actionId },
      data: { processed: !error, error: error ?? null, processedAt: new Date() },
    });
  } catch {
    /* best effort */
  }
}

/**
 * Processes a single Trello action into a normalized activity (+ entity update).
 * Idempotent: a second delivery of the same action id is a no-op.
 */
export async function processTrelloAction(action: TrelloActionDto, boardKind: BoardKind): Promise<"processed" | "skipped"> {
  const data = action.data ?? {};
  const board = (data.board as { id?: string } | undefined) ?? undefined;
  const boardId = board?.id ?? null;

  if (!(await claimAction(action, boardId))) return "skipped";

  try {
    const card = data.card as { id?: string; name?: string } | undefined;
    const cardId = card?.id;
    const actorName = action.memberCreator?.fullName ?? action.memberCreator?.username ?? null;
    const actorMemberId = action.idMemberCreator ?? null;
    const entityType = actionKind(boardKind);

    let type: BisneysActivityType | null = null;
    let oldValue: string | null = null;
    let newValue: string | null = null;
    let companyId: string | null = null;
    let candidateId: string | null = null;
    let listId: string | null = (data.list as { id?: string } | undefined)?.id ?? null;

    const bindEntity = async (status?: BisneysSalesStatus | null) => {
      if (!cardId) return;
      if (boardKind === "sales") companyId = await ensureCompanyFromCard({ id: cardId, name: card?.name }, status);
      else candidateId = await ensureCandidateFromCard({ id: cardId, name: card?.name });
    };

    switch (action.type) {
      case "createCard": {
        type = boardKind === "sales" ? "COMPANY_CREATED" : "CANDIDATE_CREATED";
        const status = await listMappedStatus((data.list as { id?: string } | undefined)?.id);
        await bindEntity(status);
        break;
      }
      case "updateCard": {
        const listAfter = data.listAfter as { id?: string; name?: string } | undefined;
        const listBefore = data.listBefore as { id?: string; name?: string } | undefined;
        const old = data.old as { name?: string; due?: string | null } | undefined;
        if (listAfter && listBefore) {
          type = "CARD_MOVED";
          oldValue = listBefore.name ?? null;
          newValue = listAfter.name ?? null;
          listId = listAfter.id ?? listId;
          await bindEntity(await listMappedStatus(listAfter.id));
        } else if (old && "due" in old) {
          type = "DUE_DATE_CHANGED";
          await bindEntity();
        } else {
          type = boardKind === "sales" ? "COMPANY_UPDATED" : "CANDIDATE_UPDATED";
          if (old?.name) oldValue = old.name;
          await bindEntity();
        }
        break;
      }
      case "commentCard": {
        const text = String((data as { text?: string }).text ?? "");
        type = commentActivityType(text);
        await bindEntity();
        if (cardId) {
          await db.bisneysComment.create({
            data: {
              body: text,
              authorName: actorName,
              authorMemberId: actorMemberId,
              source: "TRELLO",
              externalId: action.id,
              companyId,
              candidateId,
            },
          });
          if (isCallComment(text)) {
            await db.bisneysCall.create({
              data: { note: text, byMemberId: actorMemberId, source: "TRELLO", companyId, candidateId },
            });
          }
          // Normalized interaction (full text preserved + parsed type/contact).
          await recordTrelloComment({
            externalId: action.id, rawContent: text, actorName, externalActorId: actorMemberId,
            companyId, candidateId, occurredAt: action.date ? new Date(action.date) : null,
          });
        }
        break;
      }
      case "updateComment": {
        // Trello nests the edited comment under data.action; re-record by its id.
        const commentAction = (data as { action?: { id?: string; text?: string } }).action;
        const commentId = commentAction?.id;
        const text = String(commentAction?.text ?? "");
        await bindEntity();
        if (commentId) {
          await db.bisneysComment.updateMany({ where: { externalId: commentId }, data: { body: text } });
          await recordTrelloComment({
            externalId: commentId, rawContent: text, actorName, externalActorId: actorMemberId,
            companyId, candidateId, occurredAt: action.date ? new Date(action.date) : null, edited: true,
          });
        }
        await markProcessed(action.id);
        return "processed";
      }
      case "deleteComment": {
        const commentId = (data as { action?: { id?: string } }).action?.id;
        if (commentId) {
          await deleteTrelloInteraction(commentId);
          await db.bisneysComment.deleteMany({ where: { externalId: commentId } });
        }
        await markProcessed(action.id);
        return "processed";
      }
      case "addAttachmentToCard":
        type = "DOCUMENT_UPLOADED";
        await bindEntity();
        break;
      case "addMemberToCard":
        type = "CONTACT_ADDED";
        await bindEntity();
        break;
      default:
        // Stored as a raw event for debugging, but produces no activity.
        await markProcessed(action.id);
        return "processed";
    }

    await db.bisneysActivity.create({
      data: {
        type,
        source: "TRELLO",
        actorName,
        actorMemberId,
        entityType,
        entityId: companyId ?? candidateId ?? cardId ?? undefined,
        companyId,
        candidateId,
        oldValue,
        newValue,
        trelloCardId: cardId ?? null,
        boardId,
        listId,
        occurredAt: action.date ? new Date(action.date) : new Date(),
      },
    });

    await markProcessed(action.id);
    return "processed";
  } catch (e) {
    await markProcessed(action.id, (e as Error).message.slice(0, 300));
    return "processed";
  }
}

/* ---------------- board data sync ---------------- */

async function syncBoardData(creds: TrelloCreds, boardId: string, boardKind: BoardKind): Promise<void> {
  const [lists, members, cards] = await Promise.all([
    trello.boardLists(creds, boardId),
    trello.boardMembers(creds, boardId),
    trello.boardCards(creds, boardId),
  ]);

  for (const l of lists) {
    const existing = await db.bisneysTrelloList.findUnique({ where: { externalId: l.id }, select: { mappedStatus: true } });
    const mappedStatus = existing?.mappedStatus ?? (boardKind === "sales" ? defaultStatusForListName(l.name) : null);
    await db.bisneysTrelloList.upsert({
      where: { externalId: l.id },
      create: { externalId: l.id, boardId, name: l.name, position: l.pos ?? null, mappedStatus },
      update: { name: l.name, position: l.pos ?? null, mappedStatus },
    });
  }

  for (const m of members) {
    await db.bisneysTrelloMember.upsert({
      where: { externalId: m.id },
      create: { externalId: m.id, fullName: m.fullName ?? null, username: m.username ?? null },
      update: { fullName: m.fullName ?? null, username: m.username ?? null },
    });
  }

  const labelMap = boardKind === "delivery" ? await getCandidateLabelMap() : undefined;
  for (const c of cards as TrelloCardDto[]) {
    await db.bisneysTrelloCard.upsert({
      where: { externalId: c.id },
      create: {
        externalId: c.id,
        boardId,
        listId: c.idList ?? null,
        name: c.name,
        description: c.desc ?? null,
        due: c.due ? new Date(c.due) : null,
        closed: c.closed ?? false,
        labelsJson: (c.labels ?? []) as unknown as Prisma.InputJsonValue,
        rawData: c as unknown as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
      update: {
        listId: c.idList ?? null,
        name: c.name,
        description: c.desc ?? null,
        due: c.due ? new Date(c.due) : null,
        closed: c.closed ?? false,
        labelsJson: (c.labels ?? []) as unknown as Prisma.InputJsonValue,
        rawData: c as unknown as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });
    // Map every open card onto a domain entity so the CRM is populated even for
    // cards with no recent action in the imported window.
    if (!c.closed) {
      if (boardKind === "sales") await ensureCompanyFromCard({ id: c.id, name: c.name }, await listMappedStatus(c.idList));
      else await ensureCandidateFromCard({ id: c.id, name: c.name, desc: c.desc, labelsJson: c.labels }, labelMap);
    }
  }
}

/* ---------------- orchestration ---------------- */

async function selectedBoards(): Promise<{ externalId: string; kind: BoardKind }[]> {
  const conn = await getConnection();
  const boards = await db.bisneysTrelloBoard.findMany({ where: { isSelected: true }, select: { externalId: true } });
  return boards.map((b) => ({
    externalId: b.externalId,
    kind: b.externalId === conn?.salesBoardId ? "sales" : "delivery",
  }));
}

export type SyncResult = { ok: boolean; processed: number; error?: string };

/** Full initial import of every selected board (brief §16). */
export async function runInitialSync(): Promise<SyncResult> {
  const creds = await getCreds();
  if (!creds) return { ok: false, processed: 0, error: "Trello nije povezan." };

  const log = await db.bisneysTrelloSyncLog.create({ data: { kind: "initial", status: "SYNCING" } });
  await setStatus("SYNCING");
  let processed = 0;

  try {
    const boards = await selectedBoards();
    if (!boards.length) throw new Error("Nije odabran nijedan board.");

    for (const b of boards) {
      await syncBoardData(creds, b.externalId, b.kind);
      const actions = await trello.boardActions(creds, b.externalId, undefined, 1000);
      // Oldest first so state transitions apply in order.
      for (const a of actions.reverse()) {
        if ((await processTrelloAction(a, b.kind)) === "processed") processed++;
      }
      await db.bisneysTrelloBoard.updateMany({
        where: { externalId: b.externalId },
        data: { lastSyncedAt: new Date(), syncStatus: "SYNCED" },
      });
    }

    await updateConnection({ status: "SYNCED", lastSyncedAt: new Date(), lastError: null });
    await db.bisneysTrelloSyncLog.update({
      where: { id: log.id },
      data: { status: "SYNCED", finishedAt: new Date(), countsJson: { processed } },
    });
    return { ok: true, processed };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await setStatus("ERROR", msg);
    await db.bisneysTrelloSyncLog.update({
      where: { id: log.id },
      data: { status: "ERROR", finishedAt: new Date(), message: msg },
    });
    return { ok: false, processed, error: msg };
  }
}

/** Incremental reconciliation — processes actions since the last sync (brief §18). */
export async function runReconcile(): Promise<SyncResult> {
  const creds = await getCreds();
  if (!creds) return { ok: false, processed: 0, error: "Trello nije povezan." };
  const conn = await getConnection();
  const since = conn?.lastSyncedAt?.toISOString();

  const log = await db.bisneysTrelloSyncLog.create({ data: { kind: "reconcile", status: "SYNCING" } });
  let processed = 0;
  try {
    for (const b of await selectedBoards()) {
      const actions = await trello.boardActions(creds, b.externalId, since, 1000);
      for (const a of actions.reverse()) {
        if ((await processTrelloAction(a, b.kind)) === "processed") processed++;
      }
    }
    await updateConnection({ status: "SYNCED", lastSyncedAt: new Date(), lastError: null });
    await db.bisneysTrelloSyncLog.update({
      where: { id: log.id },
      data: { status: "SYNCED", finishedAt: new Date(), countsJson: { processed } },
    });
    return { ok: true, processed };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await setStatus("ERROR", msg);
    await db.bisneysTrelloSyncLog.update({ where: { id: log.id }, data: { status: "ERROR", finishedAt: new Date(), message: msg } });
    return { ok: false, processed, error: msg };
  }
}

/**
 * Re-applies the parser + label map to every synced card that is already linked
 * to a candidate (Faza 10). Enrich-only — it never creates new candidates (that
 * happens during live sync, which knows the board kind), so running it can't
 * turn sales cards into candidates.
 */
export async function reparseCandidatesFromCards(labelMap: CandidateLabelMap): Promise<{ updated: number }> {
  const cards = await db.bisneysTrelloCard.findMany({
    where: { closed: false },
    select: { externalId: true, name: true, description: true, labelsJson: true },
    take: 5000,
  });
  let updated = 0;
  for (const c of cards) {
    const linked = await db.bisneysCandidate.findFirst({ where: { externalId: c.externalId }, select: { id: true } });
    if (!linked) continue;
    await ensureCandidateFromCard({ id: c.externalId, name: c.name, desc: c.description, labelsJson: c.labelsJson }, labelMap);
    updated++;
  }
  return { updated };
}

/** Board kind for a given board id (used by the webhook). */
export async function boardKindFor(boardId: string): Promise<BoardKind | null> {
  const conn = await getConnection();
  const board = await db.bisneysTrelloBoard.findUnique({ where: { externalId: boardId }, select: { isSelected: true } });
  if (!board?.isSelected) return null;
  return boardId === conn?.salesBoardId ? "sales" : "delivery";
}
