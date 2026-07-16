import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Single-use, expiring password-setup invites (brief §9). The raw token lives
 * only in the emailed link; the database stores its SHA-256 hash, so a DB leak
 * cannot be replayed into account takeovers.
 */

const INVITE_TTL_DAYS = 7;

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Creates an invite for the user and returns the RAW token (email it, never store it). */
export async function createElectroInvite(opts: {
  userId: string;
  companyId: string;
  invitedByUserId?: string;
  invitedBySuperadminId?: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.electroInvite.create({
    data: {
      tokenHash: hashInviteToken(rawToken),
      userId: opts.userId,
      companyId: opts.companyId,
      invitedByUserId: opts.invitedByUserId,
      invitedBySuperadminId: opts.invitedBySuperadminId,
      expiresAt,
    },
  });
  return { rawToken, expiresAt };
}

/** Resolves a raw token to a live (unused, unexpired) invite, or null. */
export async function findLiveInvite(rawToken: string) {
  if (!/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const invite = await db.electroInvite.findUnique({
    where: { tokenHash: hashInviteToken(rawToken) },
    include: { user: true, company: true },
  });
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) return null;
  return invite;
}
