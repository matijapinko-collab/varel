import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import type { HvacSuperadmin } from "@/generated/prisma/client";

/**
 * Varel HVAC superadministration auth.
 *
 * Deliberately isolated from BOTH the /administracija CMS auth (Auth.js) and
 * the tenant B2B auth: its own table, cookie and guard. The initial account is
 * created ONLY by a server-side bootstrap from environment secrets — there is
 * no registration, and no tenant user can ever escalate into this role.
 *
 * The initial password is never stored in plaintext and never leaves the
 * server; it is hashed on bootstrap and becomes permanently invalid once the
 * mandatory first password change completes.
 */

export const SA_COOKIE = "hvac_sa_session";
export const SA_BASE = "/hvac/superadministracija";
const MAX_AGE_S = 60 * 60 * 4; // 4h — shorter than tenant sessions

export type SuperadminSession = { sid: string; sv: number };

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "varel-dev-secret");
}

/* ---------------- bootstrap ---------------- */

/**
 * Idempotently creates the initial superadmin from env secrets.
 * Never logs the credentials. Safe to call on every login attempt.
 */
export async function ensureSuperadminBootstrap(): Promise<void> {
  const username = process.env.INITIAL_HVAC_SUPERADMIN_USERNAME?.trim();
  const password = process.env.INITIAL_HVAC_SUPERADMIN_PASSWORD;
  if (!username || !password) return; // nothing to bootstrap (env may be removed after setup)

  const existing = await db.hvacSuperadmin.count();
  if (existing > 0) return; // already bootstrapped — never recreate

  await db.hvacSuperadmin.create({
    data: {
      username: username.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      isActive: true,
    },
  });
  console.info("[hvac superadmin] initial account bootstrapped"); // no credentials logged
}

/* ---------------- password policy ---------------- */

const COMMON = ["password", "lozinka", "zaporka", "123456", "qwerty", "admin", "varel", "welcome"];

/** Returns a Croatian error message, or null when the password is acceptable. */
export function validateSuperadminPassword(pw: string, username: string, currentHashMatches: boolean): string | null {
  if (pw.length < 12) return "Zaporka mora imati najmanje 12 znakova.";
  if (!/[A-Z]/.test(pw)) return "Zaporka mora sadržavati barem jedno veliko slovo.";
  if (!/[a-z]/.test(pw)) return "Zaporka mora sadržavati barem jedno malo slovo.";
  if (!/[0-9]/.test(pw)) return "Zaporka mora sadržavati barem jednu znamenku.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Zaporka mora sadržavati barem jedan poseban znak.";
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return "Zaporka ne smije sadržavati korisničko ime.";
  if (COMMON.some((c) => pw.toLowerCase().includes(c))) return "Zaporka je previše uobičajena. Odaberite jaču zaporku.";
  if (currentHashMatches) return "Nova zaporka mora se razlikovati od trenutne.";
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/* ---------------- session ---------------- */

export async function setSuperadminSession(sa: Pick<HvacSuperadmin, "id" | "sessionVersion">): Promise<void> {
  const token = await new SignJWT({ sid: sa.id, sv: sa.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSuperadminSession(): Promise<void> {
  const store = await cookies();
  store.set(SA_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Resolves the superadmin for the current request, re-checking DB state. */
export async function getSuperadmin(): Promise<HvacSuperadmin | null> {
  const store = await cookies();
  const token = store.get(SA_COOKIE)?.value;
  if (!token) return null;
  let payload: SuperadminSession;
  try {
    const v = await jwtVerify(token, secret());
    if (typeof v.payload.sid !== "string" || typeof v.payload.sv !== "number") return null;
    payload = { sid: v.payload.sid, sv: v.payload.sv };
  } catch {
    return null;
  }
  const sa = await db.hvacSuperadmin.findUnique({ where: { id: payload.sid } });
  if (!sa || !sa.isActive) return null;
  // Password change / forced logout invalidates older sessions.
  if (sa.sessionVersion !== payload.sv) return null;
  return sa;
}

/** Guard for superadmin pages: enforces login AND the mandatory password change. */
export async function requireSuperadmin(): Promise<HvacSuperadmin> {
  const sa = await getSuperadmin();
  if (!sa) redirect(`${SA_BASE}/prijava`);
  if (sa.mustChangePassword) redirect(`${SA_BASE}/promjena-zaporke`);
  return sa;
}

/** Guard for the password-change page: logged in, but change not yet done. */
export async function requireSuperadminForPasswordChange(): Promise<HvacSuperadmin> {
  const sa = await getSuperadmin();
  if (!sa) redirect(`${SA_BASE}/prijava`);
  return sa;
}

/* ---------------- audit ---------------- */

export async function auditSuperadmin(action: string, superadminId: string | null, meta?: Record<string, unknown>): Promise<void> {
  try {
    const m = await requestMeta();
    await db.hvacAuditLog.create({
      data: {
        tenantId: null,
        userId: superadminId,
        action,
        entityType: "SUPERADMIN",
        entityId: superadminId ?? undefined,
        afterJson: meta ? (meta as object) : undefined,
        ipHash: m.ipHash,
      },
    });
  } catch (e) {
    console.error("[hvac superadmin audit] failed", (e as Error).message);
  }
}
