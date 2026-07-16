import "server-only";
import crypto from "crypto";

/**
 * AES-256-GCM encryption for Trello credentials at rest (brief §15). The key is
 * derived from AUTH_SECRET via scrypt, so ciphertext is useless without the
 * server secret. Secrets are never returned to the browser — only masked.
 */
const ALGO = "aes-256-gcm";

function key(): Buffer {
  return crypto.scryptSync(process.env.AUTH_SECRET ?? "varel-dev-secret", "bisneys-trello-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ivb, tagb, encb] = payload.split(":");
    if (!ivb || !tagb || !encb) return null;
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivb, "base64"));
    decipher.setAuthTag(Buffer.from(tagb, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encb, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Only ever show the last 4 characters of a secret in the UI. */
export function maskSecret(s: string | null | undefined): string {
  if (!s) return "";
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
}
