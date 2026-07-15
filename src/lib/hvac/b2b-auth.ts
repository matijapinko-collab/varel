import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { HvacRole } from "@/generated/prisma/client";

/**
 * Varel HVAC B2B session — deliberately SEPARATE from the admin Auth.js system
 * (own cookie, own user table). A signed JWT (HS256, AUTH_SECRET) in an
 * httpOnly cookie. Tenant users never touch /administracija.
 */

export const HVAC_SESSION_COOKIE = "hvac_b2b_session";
const MAX_AGE_S = 60 * 60 * 8; // 8h

export type HvacSession = { uid: string; tid: string; role: HvacRole };

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "varel-dev-secret");
}

/** Feature gate: the B2B app is only reachable when explicitly enabled. */
export function isHvacB2bEnabled(): boolean {
  return process.env.HVAC_B2B_ENABLED === "true";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Sets the session cookie. Call only inside a Server Action or Route Handler. */
export async function setHvacSession(payload: HvacSession): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  const store = await cookies();
  store.set(HVAC_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearHvacSession(): Promise<void> {
  const store = await cookies();
  store.set(HVAC_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getHvacSession(): Promise<HvacSession | null> {
  const store = await cookies();
  const token = store.get(HVAC_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid === "string" && typeof payload.tid === "string" && typeof payload.role === "string") {
      return { uid: payload.uid, tid: payload.tid, role: payload.role as HvacRole };
    }
  } catch {
    /* invalid / expired */
  }
  return null;
}
