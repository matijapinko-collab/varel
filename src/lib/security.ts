import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@/generated/prisma/client";

/**
 * Privacy-preserving IP hash (per the database design doc: never store raw IPs).
 * Salted with AUTH_SECRET so hashes are not reversible via rainbow tables.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? "varel"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export async function requestMeta() {
  const h = await headers();
  const ip =
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return {
    ipHash: hashIp(ip),
    userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    referrer: h.get("referer")?.slice(0, 255) ?? null,
    country: h.get("x-vercel-ip-country") ?? null,
  };
}

/** Write an entry to the audit log. Never throws — auditing must not break the app. */
export async function audit(entry: {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
}) {
  try {
    const meta = await requestMeta();
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        detailsJson: entry.details,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

/** Strong password policy: min 10 chars, upper, lower, digit. */
export function validatePassword(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return null;
}

const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MIN = 15;

/** DB-backed rate limiting for login attempts (works in serverless). */
export async function isLoginRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MIN * 60_000);
  const failures = await db.loginAttempt.count({
    where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
  });
  return failures >= FAILED_LOGIN_LIMIT;
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  reason?: string
) {
  try {
    const meta = await requestMeta();
    await db.loginAttempt.create({
      data: { email: email.toLowerCase(), success, reason, ipHash: meta.ipHash },
    });
  } catch (e) {
    console.error("login attempt log failed", e);
  }
}
