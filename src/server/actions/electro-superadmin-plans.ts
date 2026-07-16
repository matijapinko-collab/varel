"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireElectroSuperadmin } from "@/lib/electro/auth/guard";
import { ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/constants";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Plan & limit administration (brief §5): names, prices and limits are data,
 * editable here without code changes. Superadmin-only.
 */

const PLANS_PATH = `${ELECTRO_SUPERADMIN_BASE}/paketi`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroPlanResult = { error?: string; ok?: boolean };

export async function electroUpdatePlan(
  _prev: ElectroPlanResult,
  form: FormData
): Promise<ElectroPlanResult> {
  const sa = await requireElectroSuperadmin();
  const planId = f(form, "planId");
  const plan = await db.electroSubscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Paket nije pronađen." };

  const name = f(form, "name");
  if (!name) return { error: "Naziv paketa je obavezan." };
  const priceRaw = f(form, "priceMonthlyEur").replace(",", ".");
  const price = priceRaw === "" ? null : Number(priceRaw);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "Cijena nije ispravna." };
  const trialDays = Number.parseInt(f(form, "trialDays"), 10);
  if (!Number.isFinite(trialDays) || trialDays < 1 || trialDays > 365) return { error: "Trajanje triala mora biti između 1 i 365 dana." };

  await db.electroSubscriptionPlan.update({
    where: { id: plan.id },
    data: {
      name,
      description: f(form, "description") || null,
      priceMonthlyEur: price,
      trialDays,
      isActive: f(form, "isActive") === "on",
    },
  });
  await electroAudit({
    superadminId: sa.id,
    action: "plan_updated",
    entityType: "plan",
    entityId: plan.id,
    before: { name: plan.name, price: plan.priceMonthlyEur?.toString() ?? null, trialDays: plan.trialDays },
    after: { name, price: price?.toString() ?? null, trialDays },
  });

  revalidatePath(PLANS_PATH);
  return { ok: true };
}

/** Upserts one limit row. Empty value removes the limit (= unlimited). */
export async function electroSetPlanLimit(
  _prev: ElectroPlanResult,
  form: FormData
): Promise<ElectroPlanResult> {
  const sa = await requireElectroSuperadmin();
  const planId = f(form, "planId");
  const key = f(form, "key");
  const kind = f(form, "kind"); // "int" | "bool"
  if (!key || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) return { error: "Ključ limita nije ispravan." };

  const plan = await db.electroSubscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return { error: "Paket nije pronađen." };

  const raw = f(form, "value");
  if (kind === "int") {
    if (raw === "") {
      await db.electroPlanLimit.deleteMany({ where: { planId: plan.id, key } });
    } else {
      const value = Number.parseInt(raw, 10);
      if (!Number.isFinite(value) || value < 0) return { error: "Vrijednost limita mora biti nenegativan broj." };
      await db.electroPlanLimit.upsert({
        where: { planId_key: { planId: plan.id, key } },
        create: { planId: plan.id, key, intValue: value },
        update: { intValue: value, boolValue: null },
      });
    }
  } else if (kind === "bool") {
    const value = raw === "true" || raw === "on";
    await db.electroPlanLimit.upsert({
      where: { planId_key: { planId: plan.id, key } },
      create: { planId: plan.id, key, boolValue: value },
      update: { boolValue: value, intValue: null },
    });
  } else {
    return { error: "Nepoznata vrsta limita." };
  }

  await electroAudit({ superadminId: sa.id, action: "plan_limit_set", entityType: "plan", entityId: plan.id, after: { key, value: raw || "(uklonjeno)" } });
  revalidatePath(PLANS_PATH);
  return { ok: true };
}
