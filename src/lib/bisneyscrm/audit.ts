import "server-only";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/security";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Bisneys CRM audit writer (brief §53). Separate table from Varel's audit log.
 * Never throws (auditing must not break the app) and never records passwords.
 */
export async function bisneysAudit(entry: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  source?: string;
  requestId?: string;
}): Promise<void> {
  try {
    const meta = await requestMeta();
    await db.bisneysAuditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.before,
        afterJson: entry.after,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
        source: entry.source ?? "BISNEYS_CRM",
        requestId: entry.requestId,
      },
    });
  } catch (e) {
    console.error("[bisneys audit] failed", (e as Error).message);
  }
}
