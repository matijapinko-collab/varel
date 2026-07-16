"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Material consumption (brief §41). A worker's report is NOT a final write-off —
 * it sits PENDING_CONFIRMATION until a site manager confirms. Confirmation posts
 * the single authoritative CONSUMPTION_CONFIRMED ledger movement inside a
 * transaction that re-reads the balance, which is what prevents double-spend and
 * negative stock (§41–§42).
 */

const CONSUMPTION_PATH = `${ELECTRO_APP_BASE}/potrosnja`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroConsumptionResult = { error?: string; ok?: boolean };

/** Worker reports consumption → PENDING_CONFIRMATION (no ledger movement yet). */
export async function electroReportConsumption(
  _prev: ElectroConsumptionResult,
  form: FormData
): Promise<ElectroConsumptionResult> {
  const ctx = await requireElectroContext();
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const itemId = f(form, "itemId");
  const warehouseId = f(form, "warehouseId");
  const [item, wh] = await Promise.all([
    db.electroItem.findFirst({ where: { id: itemId, companyId: ctx.company.id } }),
    db.electroWarehouse.findFirst({ where: { id: warehouseId, companyId: ctx.company.id } }),
  ]);
  if (!item || !wh) return { error: "Artikl ili skladište nisu pronađeni." };

  const qty = Number(f(form, "quantity").replace(",", "."));
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Količina mora biti pozitivan broj." };

  const c = await db.electroMaterialConsumption.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      itemId,
      warehouseId,
      phaseId: f(form, "phaseId") || null,
      locationId: f(form, "locationId") || null,
      quantity: qty.toString(),
      comment: f(form, "comment") || null,
      reportedByUserId: ctx.user.id,
      status: "PENDING_CONFIRMATION",
    },
  });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "consumption_reported", entityType: "consumption", entityId: c.id, after: { qty, itemId } });
  revalidatePath(CONSUMPTION_PATH);
  return { ok: true };
}

/**
 * Site manager confirms (full or partial) or rejects. On confirm, a single
 * CONSUMPTION_CONFIRMED movement is posted atomically after re-checking the
 * balance and re-reading the consumption row FOR UPDATE — two managers can't
 * both confirm the same row, and stock can't go negative (brief §41–§42).
 */
export async function electroConfirmConsumption(
  _prev: ElectroConsumptionResult,
  form: FormData
): Promise<ElectroConsumptionResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Potrošnju potvrđuje voditelj, inženjer ili administrator." };

  const consumptionId = f(form, "consumptionId");
  const decision = f(form, "decision"); // confirm | reject
  const confirmQtyRaw = f(form, "confirmQuantity");

  const c = await db.electroMaterialConsumption.findFirst({
    where: { id: consumptionId, companyId: ctx.company.id },
    include: { item: true },
  });
  if (!c) return { error: "Zapis potrošnje nije pronađen." };
  if (!(await loadAccessibleProject(ctx, c.projectId))) return { error: "Nemate pristup projektu." };
  if (c.status !== "PENDING_CONFIRMATION") return { error: "Ovaj zapis je već obrađen." };

  if (decision === "reject") {
    await db.electroMaterialConsumption.update({ where: { id: c.id }, data: { status: "REJECTED", confirmedByUserId: ctx.user.id, confirmedAt: new Date() } });
    await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "consumption_rejected", entityType: "consumption", entityId: c.id });
    revalidatePath(CONSUMPTION_PATH);
    return { ok: true };
  }

  const requested = Number(c.quantity);
  const confirmQty = confirmQtyRaw ? Number(confirmQtyRaw.replace(",", ".")) : requested;
  if (!Number.isFinite(confirmQty) || confirmQty <= 0) return { error: "Potvrđena količina mora biti pozitivna." };
  if (confirmQty > requested) return { error: "Potvrđena količina ne može biti veća od prijavljene." };

  try {
    await db.$transaction(async (tx) => {
      // Re-read the row and guard against a concurrent confirm (double-spend).
      const fresh = await tx.electroMaterialConsumption.findUnique({ where: { id: c.id } });
      if (!fresh || fresh.status !== "PENDING_CONFIRMATION") {
        throw new Error("Zapis je u međuvremenu obrađen. Osvježite stranicu.");
      }
      // Re-check available balance at confirm time (§42: no negative stock).
      const agg = await tx.electroStockMovement.aggregate({
        where: { companyId: ctx.company.id, itemId: c.itemId, warehouseId: c.warehouseId },
        _sum: { qtyDelta: true },
      });
      const available = Number(agg._sum.qtyDelta ?? 0);
      if (available - confirmQty < 0) {
        throw new Error(`Nedovoljna zaliha: dostupno ${available} ${c.item.unit}, potvrđujete ${confirmQty}.`);
      }
      const movement = await tx.electroStockMovement.create({
        data: {
          companyId: ctx.company.id, itemId: c.itemId, warehouseId: c.warehouseId,
          type: "CONSUMPTION_CONFIRMED", qtyDelta: (-confirmQty).toString(),
          unitPrice: c.item.purchasePrice ?? null, projectId: c.projectId,
          reason: "Potvrđena potrošnja", reference: c.id, createdByUserId: ctx.user.id,
        },
      });
      await tx.electroMaterialConsumption.update({
        where: { id: c.id },
        data: {
          status: confirmQty < requested ? "PARTIALLY_CONFIRMED" : "CONFIRMED",
          confirmedQuantity: confirmQty.toString(),
          confirmedByUserId: ctx.user.id,
          confirmedAt: new Date(),
          movementId: movement.id,
        },
      });
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "consumption_confirmed", entityType: "consumption", entityId: c.id, after: { confirmQty } });
  revalidatePath(CONSUMPTION_PATH);
  return { ok: true };
}
