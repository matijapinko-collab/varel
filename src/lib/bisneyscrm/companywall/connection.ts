import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/bisneyscrm/trello/crypto";

/**
 * CompanyWall connection store (Company Intelligence Faza 3). Credentials are
 * AES-256-GCM encrypted (reusing the Trello crypto) and stored in BisneysSetting.
 * The secret/token is never returned to the browser — only a mask (brief §9).
 */

const KEY = "companywall_connection";

type Stored = { apiUrl: string; country: string | null; apiKeyEnc: string; apiSecretEnc: string | null; apiKeyMask: string };

export type CompanyWallConnection = {
  connected: boolean;
  apiUrl: string | null;
  country: string | null;
  keyMask: string | null;
};

export async function getCompanyWallConnection(): Promise<CompanyWallConnection> {
  const s = await db.bisneysSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  const v = s?.valueJson as Stored | undefined;
  if (!v?.apiUrl) return { connected: false, apiUrl: null, country: null, keyMask: null };
  return { connected: true, apiUrl: v.apiUrl, country: v.country ?? null, keyMask: v.apiKeyMask ?? "••••" };
}

/** Server-only decrypted credentials for making an API call. */
export async function getCompanyWallCreds(): Promise<{ apiUrl: string; country: string | null; apiKey: string; apiSecret: string | null } | null> {
  const s = await db.bisneysSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  const v = s?.valueJson as Stored | undefined;
  if (!v?.apiUrl) return null;
  const apiKey = decryptSecret(v.apiKeyEnc);
  if (!apiKey) return null;
  return { apiUrl: v.apiUrl, country: v.country ?? null, apiKey, apiSecret: decryptSecret(v.apiSecretEnc) };
}

export async function saveCompanyWallConnection(input: { apiUrl: string; country: string | null; apiKey: string; apiSecret: string | null }): Promise<void> {
  const stored: Stored = {
    apiUrl: input.apiUrl.trim(),
    country: input.country,
    apiKeyEnc: encryptSecret(input.apiKey),
    apiSecretEnc: input.apiSecret ? encryptSecret(input.apiSecret) : null,
    apiKeyMask: maskSecret(input.apiKey),
  };
  await db.bisneysSetting.upsert({ where: { key: KEY }, create: { key: KEY, valueJson: stored }, update: { valueJson: stored } });
}

export async function disconnectCompanyWall(): Promise<void> {
  await db.bisneysSetting.deleteMany({ where: { key: KEY } });
}
