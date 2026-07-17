"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, boolOf } from "@/lib/bisneyscrm/forms";
import { CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";
import type { BisneysCandidateStatus } from "@/generated/prisma/client";

const CANDIDATES = "/bisneyscrm/candidates";
const POOLS = "/bisneyscrm/talent-pools";

/* ------------------------------------------------------------------ */
/* Saved views (spremljeni prikazi)                                   */
/* ------------------------------------------------------------------ */

export async function saveCandidateView(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const name = str(form.get("name"));
  const filtersRaw = str(form.get("filters"));
  if (!name || !filtersRaw) redirect(CANDIDATES);
  let filters: unknown;
  try { filters = JSON.parse(filtersRaw); } catch { redirect(CANDIDATES); }
  await db.bisneysSavedView.create({
    data: { name, entityType: "CANDIDATE", userId: user.id, isShared: boolOf(form.get("isShared")), filters: filters as object },
  });
  await bisneysAudit({ userId: user.id, action: "saved_view_created", entityType: "saved_view", after: { name } });
  revalidatePath(CANDIDATES);
  redirect(`${CANDIDATES}?f=${encodeURIComponent(filtersRaw)}`);
}

export async function deleteCandidateView(id: string): Promise<void> {
  const user = await requireBisneysUser();
  const view = await db.bisneysSavedView.findUnique({ where: { id } });
  // Owner or a shared view can be removed by any CRM user; else no-op.
  if (view && (view.userId === user.id || view.isShared)) {
    await db.bisneysSavedView.delete({ where: { id } });
    await bisneysAudit({ userId: user.id, action: "saved_view_deleted", entityType: "saved_view", entityId: id });
  }
  revalidatePath(CANDIDATES);
}

/* ------------------------------------------------------------------ */
/* Talent pools                                                        */
/* ------------------------------------------------------------------ */

export async function createTalentPool(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const name = str(form.get("name"));
  if (!name) redirect(POOLS);
  const pool = await db.bisneysTalentPool.create({
    data: { name, description: opt(form.get("description")), color: opt(form.get("color")), ownerUserId: user.id },
  });
  await bisneysAudit({ userId: user.id, action: "talent_pool_created", entityType: "talent_pool", entityId: pool.id, after: { name } });
  revalidatePath(POOLS);
  redirect(`${POOLS}/${pool.id}`);
}

export async function deleteTalentPool(id: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysTalentPool.delete({ where: { id } });
  await bisneysAudit({ userId: user.id, action: "talent_pool_deleted", entityType: "talent_pool", entityId: id });
  revalidatePath(POOLS);
  redirect(POOLS);
}

export async function removeFromPool(poolId: string, candidateId: string): Promise<void> {
  const user = await requireBisneysUser();
  await db.bisneysTalentPoolMember.deleteMany({ where: { poolId, candidateId } });
  await bisneysAudit({ userId: user.id, action: "talent_pool_member_removed", entityType: "talent_pool", entityId: poolId, after: { candidateId } });
  revalidatePath(`${POOLS}/${poolId}`);
}

/** Idempotent bulk add: skips candidates already in the pool. */
async function addCandidatesToPool(poolId: string, candidateIds: string[], userId: string): Promise<number> {
  if (!candidateIds.length) return 0;
  const existing = await db.bisneysTalentPoolMember.findMany({ where: { poolId, candidateId: { in: candidateIds } }, select: { candidateId: true } });
  const have = new Set(existing.map((m) => m.candidateId));
  const fresh = candidateIds.filter((id) => !have.has(id));
  if (fresh.length) {
    await db.bisneysTalentPoolMember.createMany({ data: fresh.map((candidateId) => ({ poolId, candidateId, addedByUserId: userId })) });
  }
  return fresh.length;
}

/* ------------------------------------------------------------------ */
/* Bulk actions on selected candidates                                */
/* ------------------------------------------------------------------ */

/** Reads `ids` (multiple), `action`, and `value` from the selection form. */
export async function bulkCandidateAction(form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const ids = form.getAll("ids").map((v) => (typeof v === "string" ? v : "")).filter(Boolean);
  const action = str(form.get("action"));
  const value = str(form.get("value"));
  const back = str(form.get("returnTo")) || CANDIDATES;
  if (!ids.length || !action) redirect(back);

  let affected = 0;
  switch (action) {
    case "setStatus": {
      if (!(CANDIDATE_STATUS_VALUES as string[]).includes(value)) break;
      const res = await db.bisneysCandidate.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { status: value as BisneysCandidateStatus } });
      affected = res.count;
      for (const candidateId of ids) {
        await db.bisneysCandidateStatusHistory.create({ data: { candidateId, toStatus: value, changedById: user.id, note: "Bulk promjena statusa" } }).catch(() => {});
      }
      break;
    }
    case "addTag": {
      if (!value) break;
      // Postgres array append with dedup — one update per row keeps it simple and safe.
      const rows = await db.bisneysCandidate.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, tags: true } });
      for (const r of rows) {
        if (!r.tags.includes(value)) {
          await db.bisneysCandidate.update({ where: { id: r.id }, data: { tags: { set: [...r.tags, value] } } });
          affected++;
        }
      }
      break;
    }
    case "removeTag": {
      if (!value) break;
      const rows = await db.bisneysCandidate.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, tags: true } });
      for (const r of rows) {
        if (r.tags.includes(value)) {
          await db.bisneysCandidate.update({ where: { id: r.id }, data: { tags: { set: r.tags.filter((t) => t !== value) } } });
          affected++;
        }
      }
      break;
    }
    case "addToPool": {
      if (!value) break;
      affected = await addCandidatesToPool(value, ids, user.id);
      break;
    }
    case "archive": {
      const res = await db.bisneysCandidate.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt: new Date(), deletedById: user.id } });
      affected = res.count;
      break;
    }
    default:
      break;
  }

  await bisneysAudit({ userId: user.id, action: `bulk_${action}`, entityType: "candidate", after: { count: ids.length, affected, value: value || undefined } });
  revalidatePath(CANDIDATES);
  redirect(back);
}
