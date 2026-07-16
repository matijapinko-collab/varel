import "server-only";
import { db } from "@/lib/db";
import type { HvacDocType, Prisma } from "@/generated/prisma/client";

const PREFIX: Record<HvacDocType, string> = {
  WORK_ORDER: "RN",
  QUOTATION: "PON",
  INVOICE: "RAC",
};

/**
 * Allocates the next per-tenant, per-type, per-year document number
 * (e.g. RN-2026-0001). Concurrency-safe: the counter row is upserted then
 * atomically incremented at the database level. Never exposes global counts.
 *
 * Pass the surrounding transaction client when generating inside a larger
 * write so the number and the document commit together.
 */
export async function nextDocNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  docType: HvacDocType,
  year = new Date().getFullYear(),
): Promise<string> {
  await tx.hvacDocCounter.upsert({
    where: { tenantId_docType_year: { tenantId, docType, year } },
    create: { tenantId, docType, year, counter: 0 },
    update: {},
  });
  const updated = await tx.hvacDocCounter.update({
    where: { tenantId_docType_year: { tenantId, docType, year } },
    data: { counter: { increment: 1 } },
  });
  return `${PREFIX[docType]}-${year}-${String(updated.counter).padStart(4, "0")}`;
}
