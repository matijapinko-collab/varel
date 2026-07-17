"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { trello } from "@/lib/bisneyscrm/trello/client";
import { getCreds, saveCreds, updateConnection, setStatus, disconnect } from "@/lib/bisneyscrm/trello/connection";
import { runInitialSync, runReconcile, reparseCandidatesFromCards } from "@/lib/bisneyscrm/trello/sync";
import { getCandidateLabelMap, setCandidateLabelMap, distinctCandidateLabels } from "@/lib/bisneyscrm/trello/candidate-map";
import type { CandidateLabelMap } from "@/lib/bisneyscrm/import/trello-parse";
import type { BisneysSalesStatus } from "@/generated/prisma/client";
import { SALES_STATUS_VALUES } from "@/lib/bisneyscrm/trello/mapping";
import { str, opt } from "@/lib/bisneyscrm/forms";
import { CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";

const LABELS_PAGE = "/bisneyscrm/settings/trello/labels";

const PAGE = "/bisneyscrm/settings/trello";
function revalidate() {
  revalidatePath(PAGE);
}

function callbackUrl(): string {
  return (
    process.env.BISNEYS_TRELLO_CALLBACK_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/bisneyscrm/trello/webhook`
  );
}

export type TrelloConnectResult = { error?: string; ok?: boolean };

/** Store credentials (encrypted), verify them, and import the board list. */
export async function saveTrelloCredentials(_prev: TrelloConnectResult, form: FormData): Promise<TrelloConnectResult> {
  await requireBisneysSuperadmin();
  const key = String(form.get("apiKey") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  if (!key || !token) return { error: "Unesite API ključ i token." };

  try {
    const me = await trello.me({ key, token }); // fails fast on bad credentials
    await saveCreds(key, token);
    await updateConnection({ status: "PENDING", workspaceName: me.fullName ?? me.username ?? null, lastError: null });
    const boards = await trello.boards({ key, token });
    for (const b of boards) {
      await db.bisneysTrelloBoard.upsert({
        where: { externalId: b.id },
        create: { externalId: b.id, name: b.name },
        update: { name: b.name },
      });
    }
    await bisneysAudit({ action: "trello_connected", entityType: "trello", after: { boards: boards.length } });
  } catch (e) {
    return { error: `Povezivanje nije uspjelo: ${(e as Error).message}` };
  }
  revalidate();
  return { ok: true };
}

export async function testTrelloConnection(): Promise<void> {
  await requireBisneysSuperadmin();
  const creds = await getCreds();
  if (!creds) {
    await setStatus("DISCONNECTED", "Nema spremljenih kredencijala.");
    revalidate();
    return;
  }
  try {
    await trello.me(creds);
    await updateConnection({ lastError: null });
  } catch (e) {
    await setStatus("ERROR", (e as Error).message.slice(0, 300));
  }
  revalidate();
}

export async function refreshTrelloBoards(): Promise<void> {
  await requireBisneysSuperadmin();
  const creds = await getCreds();
  if (!creds) return;
  try {
    const boards = await trello.boards(creds);
    for (const b of boards) {
      await db.bisneysTrelloBoard.upsert({
        where: { externalId: b.id },
        create: { externalId: b.id, name: b.name },
        update: { name: b.name },
      });
    }
  } catch (e) {
    await setStatus("ERROR", (e as Error).message.slice(0, 300));
  }
  revalidate();
}

/** Board selection: which boards are tracked and which one is the sales board. */
export async function saveBoardSelection(form: FormData): Promise<void> {
  await requireBisneysSuperadmin();
  const salesId = String(form.get("sales") ?? "");
  const boards = await db.bisneysTrelloBoard.findMany();
  for (const b of boards) {
    const tracked = form.get(`board:${b.externalId}`) === "on";
    const isSales = b.externalId === salesId;
    await db.bisneysTrelloBoard.update({
      where: { id: b.id },
      data: { isSelected: tracked || isSales, kind: isSales ? "sales" : tracked ? "delivery" : null },
    });
  }
  await updateConnection({ salesBoardId: salesId || null });
  await bisneysAudit({ action: "trello_boards_selected", entityType: "trello", after: { salesId } });
  revalidate();
}

/** Bulk list → status mapping (keyed by Trello list id, survives renames). */
export async function saveListMapping(form: FormData): Promise<void> {
  await requireBisneysSuperadmin();
  const valid = new Set<string>(SALES_STATUS_VALUES);
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("list:")) continue;
    const listId = k.slice(5);
    const val = String(v);
    const mappedStatus = valid.has(val) ? (val as BisneysSalesStatus) : null;
    await db.bisneysTrelloList.update({ where: { externalId: listId }, data: { mappedStatus } }).catch(() => {});
  }
  await bisneysAudit({ action: "trello_list_mapping_updated", entityType: "trello" });
  revalidate();
}

export async function runTrelloInitialSync(): Promise<void> {
  await requireBisneysSuperadmin();
  const res = await runInitialSync();
  await bisneysAudit({ action: "trello_initial_sync", entityType: "trello", after: { ...res } });
  revalidate();
}

export async function runTrelloReconcile(): Promise<void> {
  await requireBisneysSuperadmin();
  const res = await runReconcile();
  await bisneysAudit({ action: "trello_reconcile", entityType: "trello", after: { ...res } });
  revalidate();
}

/** Recreate the webhook on every selected board pointing at our callback URL. */
export async function recreateTrelloWebhook(): Promise<void> {
  await requireBisneysSuperadmin();
  const creds = await getCreds();
  if (!creds) return;
  const url = callbackUrl();
  try {
    const existing = await trello.webhooksForToken(creds).catch(() => []);
    for (const h of existing) if (h.callbackURL === url) await trello.deleteWebhook(creds, h.id).catch(() => {});
    await db.bisneysTrelloWebhook.deleteMany({});

    const boards = await db.bisneysTrelloBoard.findMany({ where: { isSelected: true } });
    for (const b of boards) {
      const wh = await trello.createWebhook(creds, b.externalId, url);
      await db.bisneysTrelloWebhook.create({
        data: { externalId: wh.id, boardId: b.externalId, callbackUrl: url, active: wh.active ?? true },
      });
    }
    await updateConnection({ lastError: null });
    await bisneysAudit({ action: "trello_webhook_recreated", entityType: "trello", after: { boards: boards.length, url } });
  } catch (e) {
    await setStatus("ERROR", (e as Error).message.slice(0, 300));
  }
  revalidate();
}

export async function disconnectTrello(): Promise<void> {
  await requireBisneysSuperadmin();
  const creds = await getCreds();
  try {
    if (creds) {
      const existing = await trello.webhooksForToken(creds).catch(() => []);
      const url = callbackUrl();
      for (const h of existing) if (h.callbackURL === url) await trello.deleteWebhook(creds, h.id).catch(() => {});
    }
  } catch {
    /* best effort */
  }
  await db.bisneysTrelloWebhook.deleteMany({});
  await disconnect();
  await bisneysAudit({ action: "trello_disconnected", entityType: "trello" });
  revalidate();
}

/* ---------------- Faza 10: candidate label mapping ---------------- */

/**
 * Persists the Trello label → candidate mapping. Reads one row per distinct
 * label: `prof:<label>`, `status:<label>`, `tag:<label>`. Empty rows are dropped.
 */
export async function saveCandidateLabelMap(form: FormData): Promise<void> {
  await requireBisneysSuperadmin();
  const labels = await distinctCandidateLabels();
  const map: CandidateLabelMap = {};
  for (const label of labels) {
    const professionId = opt(form.get(`prof:${label}`));
    const statusRaw = str(form.get(`status:${label}`));
    const status = (CANDIDATE_STATUS_VALUES as string[]).includes(statusRaw) ? statusRaw : undefined;
    const tag = opt(form.get(`tag:${label}`));
    if (!professionId && !status && !tag) continue;
    map[label] = {
      ...(professionId ? { professionId } : {}),
      ...(status ? { status } : {}),
      ...(tag ? { tag } : {}),
    };
  }
  await setCandidateLabelMap(map);
  await bisneysAudit({ action: "trello_label_map_saved", entityType: "trello", after: { labels: Object.keys(map).length } });
  revalidatePath(LABELS_PAGE);
}

/** Re-applies the current label map + parser to every synced delivery card. */
export async function reparseTrelloCandidatesAction(): Promise<void> {
  await requireBisneysSuperadmin();
  const map = await getCandidateLabelMap();
  const res = await reparseCandidatesFromCards(map);
  await bisneysAudit({ action: "trello_candidates_reparsed", entityType: "candidate", after: res });
  revalidatePath(LABELS_PAGE);
  revalidatePath("/bisneyscrm/candidates");
}
