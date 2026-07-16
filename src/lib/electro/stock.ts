import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Stock ledger helpers (brief §40–§42). Balance is always the SUM of movement
 * deltas — there is no mutable quantity field. Confirmation posts a single
 * CONSUMPTION_CONFIRMED movement inside a transaction that re-reads the balance,
 * which prevents double-spend and negative stock (§41 sprječavanje dvostrukog
 * trošenja, §42 negativno stanje).
 */

/** Available quantity of an item in a warehouse = SUM(qtyDelta). */
export async function availableQuantity(
  tx: Prisma.TransactionClient | typeof db,
  companyId: string,
  itemId: string,
  warehouseId: string
): Promise<number> {
  const agg = await tx.electroStockMovement.aggregate({
    where: { companyId, itemId, warehouseId },
    _sum: { qtyDelta: true },
  });
  return Number(agg._sum.qtyDelta ?? 0);
}

/** Movement types that decrease stock (stored as negative deltas). */
export const NEGATIVE_MOVEMENT_TYPES = new Set([
  "TRANSFER_OUT",
  "ISSUE_TO_PROJECT",
  "CONSUMPTION_CONFIRMED",
  "ADJUSTMENT_OUT",
  "DAMAGE",
  "LOSS",
  "WRITE_OFF",
]);
