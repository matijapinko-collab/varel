import "server-only";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Varel Electric audit writer (brief §60). Separate table from Varel's and
 * Bisneys' audit logs. Never throws (auditing must not break the app) and
 * never records passwords or raw invite tokens.
 */
export async function electroAudit(entry: {
  companyId?: string | null;
  userId?: string | null;
  superadminId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string;
}): Promise<void> {
  try {
    const meta = await requestMeta();
    await db.electroAuditLog.create({
      data: {
        companyId: entry.companyId ?? null,
        userId: entry.userId ?? null,
        superadminId: entry.superadminId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.before,
        afterJson: entry.after,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
        requestId: entry.requestId,
      },
    });
  } catch (e) {
    console.error("[electro audit] failed", (e as Error).message);
  }
}
