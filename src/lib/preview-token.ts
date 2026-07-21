import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Short-lived signed tokens that let an admin view an unpublished article on
 * the public route. Deliberately stateless (no DB column) so no migration is
 * needed and links expire on their own.
 */

const TTL_MINUTES = 30;

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "varel-dev-secret");
}

/** Mints a preview token for one article. Caller must already be authorized. */
export async function signPreviewToken(articleId: string): Promise<string> {
  return new SignJWT({ aid: articleId, k: "preview" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_MINUTES}m`)
    .sign(secret());
}

/** Returns the article id the token grants preview access to, or null. */
export async function verifyPreviewToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.k !== "preview" || typeof payload.aid !== "string") return null;
    return payload.aid;
  } catch {
    return null;
  }
}

export const PREVIEW_TTL_MINUTES = TTL_MINUTES;
