"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroAdmin, requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { checkIntLimit } from "@/lib/electro/limits";
import { canManageProjects } from "@/lib/electro/project-access";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroWarehouseType, ElectroStockMovementType } from "@/generated/prisma/client";

/**
 * Warehouses, items and stock receipts/adjustments (brief §37–§40, §49).
 * Warehouse/item management is admin-or-manager; every write is a ledger
 * movement — quantities are never edited directly (brief §40).
 */

const WAREHOUSES_PATH = `${ELECTRO_APP_BASE}/skladista`;
const MATERIALS_PATH = `${ELECTRO_APP_BASE}/materijali`;
const WH_TYPES = new Set<ElectroWarehouseType>(["CENTRAL", "REGIONAL", "MOBILE", "SITE", "TEMPORARY", "RETURNS", "DEFECTIVE"]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function decOrNull(form: FormData, key: string): string | null {
  const v = f(form, key).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? v : null;
}

export type ElectroWarehouseResult = { error?: string; ok?: boolean };

export async function electroCreateWarehouse(
  _prev: ElectroWarehouseResult,
  form: FormData
): Promise<ElectroWarehouseResult> {
  const ctx = await requireElectroAdmin();
  const name = f(form, "name");
  const code = f(form, "code");
  if (!name || !code) return { error: "Naziv i šifra skladišta su obavezni." };

  const limit = await checkIntLimit(
    ctx.subscription.planId,
    "maxWarehouses",
    await db.electroWarehouse.count({ where: { companyId: ctx.company.id, isActive: true } })
  );
  if (limit) return { error: limit };

  if (await db.electroWarehouse.findFirst({ where: { companyId: ctx.company.id, code } })) {
    return { error: "Skladište s ovom šifrom već postoji." };
  }
  const typeRaw = f(form, "type") as ElectroWarehouseType;
  const type = WH_TYPES.has(typeRaw) ? typeRaw : "CENTRAL";

  const wh = await db.electroWarehouse.create({
    data: { companyId: ctx.company.id, name, code, type, address: f(form, "address") || null },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "warehouse_created", entityType: "warehouse", entityId: wh.id, after: { code, name } });
  revalidatePath(WAREHOUSES_PATH);
  return { ok: true };
}

export async function electroCreateItem(
  _prev: ElectroWarehouseResult,
  form: FormData
): Promise<ElectroWarehouseResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx) && !ctx.roles.includes("ADMIN")) return { error: "Nemate ovlast." };
  const name = f(form, "name");
  const sku = f(form, "sku");
  if (!name || !sku) return { error: "Naziv i šifra artikla su obavezni." };

  if (await db.electroItem.findFirst({ where: { companyId: ctx.company.id, sku } })) {
    return { error: "Artikl s ovom šifrom već postoji." };
  }

  const item = await db.electroItem.create({
    data: {
      companyId: ctx.company.id,
      sku,
      externalSku: f(form, "externalSku") || null,
      name,
      category: f(form, "category") || null,
      unit: f(form, "unit") || "kom",
      barcode: f(form, "barcode") || null,
      purchasePrice: decOrNull(form, "purchasePrice"),
      minStock: decOrNull(form, "minStock"),
      targetStock: decOrNull(form, "targetStock"),
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "item_created", entityType: "item", entityId: item.id, after: { sku, name } });
  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

/** Post a receipt / opening balance / adjustment as a ledger movement (brief §40, §49). */
export async function electroPostMovement(
  _prev: ElectroWarehouseResult,
  form: FormData
): Promise<ElectroWarehouseResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx) && !ctx.roles.includes("ADMIN")) return { error: "Nemate ovlast." };

  const itemId = f(form, "itemId");
  const warehouseId = f(form, "warehouseId");
  const typeRaw = f(form, "type") as ElectroStockMovementType;
  const allowed = new Set<ElectroStockMovementType>(["OPENING_BALANCE", "RECEIPT", "RETURN_FROM_PROJECT", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "LOSS", "WRITE_OFF"]);
  if (!allowed.has(typeRaw)) return { error: "Nedopuštena vrsta pomaka." };

  const [item, wh] = await Promise.all([
    db.electroItem.findFirst({ where: { id: itemId, companyId: ctx.company.id } }),
    db.electroWarehouse.findFirst({ where: { id: warehouseId, companyId: ctx.company.id } }),
  ]);
  if (!item || !wh) return { error: "Artikl ili skladište nisu pronađeni." };

  const qtyRaw = f(form, "quantity").replace(",", ".");
  const qty = Number(qtyRaw);
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Količina mora biti pozitivan broj." };
  const reason = f(form, "reason");
  // Adjustments/losses require a reason (brief §49 — no silent quantity edits).
  if (["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "LOSS", "WRITE_OFF"].includes(typeRaw) && !reason) {
    return { error: "Za korekciju, oštećenje, gubitak ili otpis obavezan je razlog." };
  }

  const negative = new Set(["ADJUSTMENT_OUT", "DAMAGE", "LOSS", "WRITE_OFF"]).has(typeRaw);
  const qtyDelta = negative ? -qty : qty;

  try {
    await db.$transaction(async (tx) => {
      if (negative) {
        const agg = await tx.electroStockMovement.aggregate({ where: { companyId: ctx.company.id, itemId, warehouseId }, _sum: { qtyDelta: true } });
        const available = Number(agg._sum.qtyDelta ?? 0);
        if (available + qtyDelta < 0) throw new Error(`Nedovoljna zaliha: dostupno ${available} ${item.unit}.`);
      }
      await tx.electroStockMovement.create({
        data: {
          companyId: ctx.company.id, itemId, warehouseId, type: typeRaw, qtyDelta: qtyDelta.toString(),
          unitPrice: decOrNull(form, "unitPrice"), reason: reason || null, reference: f(form, "reference") || null,
          createdByUserId: ctx.user.id,
        },
      });
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "stock_movement", entityType: "item", entityId: itemId, after: { type: typeRaw, qtyDelta, warehouseId } });
  revalidatePath(MATERIALS_PATH);
  revalidatePath(`${MATERIALS_PATH}/${itemId}`);
  return { ok: true };
}
