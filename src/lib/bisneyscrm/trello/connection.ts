import "server-only";
import { db } from "@/lib/db";
import type { BisneysTrelloConnection, BisneysSyncStatus } from "@/generated/prisma/client";
import { encryptSecret, decryptSecret, maskSecret } from "./crypto";
import type { TrelloCreds } from "./client";

/**
 * Single-row store for the Trello connection. Credentials are encrypted at rest
 * and only ever decrypted server-side (brief §15). The frontend receives a
 * masked, credential-free view.
 */

const SINGLETON_ID = "bisneys-trello";

export async function getConnection(): Promise<BisneysTrelloConnection | null> {
  return db.bisneysTrelloConnection.findFirst();
}

/** Decrypted credentials for server-side Trello calls, or null when unset. */
export async function getCreds(): Promise<TrelloCreds | null> {
  const conn = await getConnection();
  if (!conn) return null;
  const key = decryptSecret(conn.apiKeyEnc);
  const token = decryptSecret(conn.tokenEnc);
  if (!key || !token) return null;
  return { key, token };
}

export async function saveCreds(apiKey: string, token: string): Promise<BisneysTrelloConnection> {
  const existing = await getConnection();
  const data = {
    apiKeyEnc: encryptSecret(apiKey),
    tokenEnc: encryptSecret(token),
  };
  if (existing) {
    return db.bisneysTrelloConnection.update({ where: { id: existing.id }, data });
  }
  return db.bisneysTrelloConnection.create({ data: { id: SINGLETON_ID, ...data } });
}

export async function updateConnection(
  patch: Partial<Pick<BisneysTrelloConnection, "status" | "lastError" | "lastSyncedAt" | "workspaceId" | "workspaceName" | "salesBoardId">>
): Promise<void> {
  const existing = await getConnection();
  if (!existing) return;
  await db.bisneysTrelloConnection.update({ where: { id: existing.id }, data: patch });
}

export async function setStatus(status: BisneysSyncStatus, lastError?: string | null): Promise<void> {
  await updateConnection({ status, ...(lastError !== undefined ? { lastError } : {}) });
}

export async function disconnect(): Promise<void> {
  const existing = await getConnection();
  if (!existing) return;
  await db.bisneysTrelloConnection.update({
    where: { id: existing.id },
    data: { apiKeyEnc: null, tokenEnc: null, status: "DISCONNECTED", lastError: null },
  });
}

/** Browser-safe view: no secrets, credentials only indicated as present/masked. */
export type SafeConnection = {
  connected: boolean;
  status: BisneysSyncStatus;
  workspaceName: string | null;
  salesBoardId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  tokenMask: string;
};

export async function getSafeConnection(): Promise<SafeConnection> {
  const conn = await getConnection();
  const creds = await getCreds();
  return {
    connected: !!creds,
    status: conn?.status ?? "DISCONNECTED",
    workspaceName: conn?.workspaceName ?? null,
    salesBoardId: conn?.salesBoardId ?? null,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
    lastError: conn?.lastError ?? null,
    tokenMask: maskSecret(creds?.token ?? null),
  };
}
