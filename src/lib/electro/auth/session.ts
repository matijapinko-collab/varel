import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

/**
 * Varel Electric sessions — deliberately SEPARATE from the Varel Auth.js admin
 * system, Bisneys CRM and HVAC sessions. Two independent cookies:
 *  - electro_session     → company users (ElectroUser)
 *  - electro_sa_session  → global platform superadmins (ElectroSuperadmin)
 * Signed JWTs (HS256, AUTH_SECRET) in httpOnly cookies; DB state is re-checked
 * in the guards on every request (brief §62).
 */

export { ELECTRO_BASE, ELECTRO_APP_BASE, ELECTRO_SUPERADMIN_BASE } from "../constants";

export const ELECTRO_SESSION_COOKIE = "electro_session";
export const ELECTRO_SA_SESSION_COOKIE = "electro_sa_session";

/** Field staff keep a working-day session; superadmin sessions stay short. */
const USER_MAX_AGE_S = 60 * 60 * 12;
const SA_MAX_AGE_S = 60 * 60;

export type ElectroSessionPayload = { uid: string; sv: number };
export type ElectroSaSessionPayload = { said: string; sv: number };

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "varel-dev-secret");
}

/** Feature gate: Electric only functions when explicitly enabled. */
export function isElectroEnabled(): boolean {
  return process.env.ELECTRO_ENABLED === "true";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function sign(payload: Record<string, unknown>, maxAgeS: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeS}s`)
    .sign(secret());
}

async function setCookie(name: string, token: string, maxAgeS: number): Promise<void> {
  const store = await cookies();
  store.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeS,
  });
}

export async function setElectroSession(payload: ElectroSessionPayload): Promise<void> {
  await setCookie(ELECTRO_SESSION_COOKIE, await sign({ ...payload }, USER_MAX_AGE_S), USER_MAX_AGE_S);
}
export async function setElectroSaSession(payload: ElectroSaSessionPayload): Promise<void> {
  await setCookie(ELECTRO_SA_SESSION_COOKIE, await sign({ ...payload }, SA_MAX_AGE_S), SA_MAX_AGE_S);
}

export async function clearElectroSession(): Promise<void> {
  const store = await cookies();
  store.set(ELECTRO_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
export async function clearElectroSaSession(): Promise<void> {
  const store = await cookies();
  store.set(ELECTRO_SA_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Reads and verifies the user JWT. DB state is re-checked in the guard. */
export async function readElectroToken(): Promise<ElectroSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ELECTRO_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid === "string" && typeof payload.sv === "number") {
      return { uid: payload.uid, sv: payload.sv };
    }
  } catch {
    /* invalid / expired */
  }
  return null;
}

export async function readElectroSaToken(): Promise<ElectroSaSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ELECTRO_SA_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.said === "string" && typeof payload.sv === "number") {
      return { said: payload.said, sv: payload.sv };
    }
  } catch {
    /* invalid / expired */
  }
  return null;
}
