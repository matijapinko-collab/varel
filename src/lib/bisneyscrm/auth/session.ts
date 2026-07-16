import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { BisneysRole } from "@/generated/prisma/client";

/**
 * Bisneys CRM session — deliberately SEPARATE from the Varel Auth.js admin
 * system and from the HVAC B2B / superadmin sessions. Its own cookie, its own
 * user table (BisneysUser). A signed JWT (HS256, AUTH_SECRET) in an httpOnly
 * cookie. CRM users never touch /administracija and Varel admins never get CRM
 * access implicitly (brief §6).
 */

export { BISNEYS_BASE } from "../constants";

export const BISNEYS_SESSION_COOKIE = "bisneys_session";
const MAX_AGE_S = 60 * 60; // 60-minute session (brief §11 idle-timeout guidance)

export type BisneysSessionPayload = { uid: string; sv: number; role: BisneysRole };

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "varel-dev-secret");
}

/** Feature gate: the CRM only functions when explicitly enabled (brief §1, deploy safety). */
export function isBisneysEnabled(): boolean {
  return process.env.BISNEYS_CRM_ENABLED === "true";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Sets the session cookie. Call only inside a Server Action or Route Handler. */
export async function setBisneysSession(payload: BisneysSessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  const store = await cookies();
  store.set(BISNEYS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearBisneysSession(): Promise<void> {
  const store = await cookies();
  store.set(BISNEYS_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Reads and verifies the JWT. DB state is re-checked in the guard, not here. */
export async function readBisneysToken(): Promise<BisneysSessionPayload | null> {
  const store = await cookies();
  const token = store.get(BISNEYS_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.uid === "string" &&
      typeof payload.sv === "number" &&
      typeof payload.role === "string"
    ) {
      return { uid: payload.uid, sv: payload.sv, role: payload.role as BisneysRole };
    }
  } catch {
    /* invalid / expired */
  }
  return null;
}
