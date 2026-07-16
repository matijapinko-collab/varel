"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";

type Entity = "company" | "candidate" | "person" | "job";

/** Restore a soft-deleted business entity (brief §56 archive). Superadmin only. */
export async function restoreEntity(entity: Entity, id: string): Promise<void> {
  const user = await requireBisneysSuperadmin();
  const data = { deletedAt: null, deletedById: null };
  if (entity === "company") await db.bisneysCompany.update({ where: { id }, data });
  else if (entity === "candidate") await db.bisneysCandidate.update({ where: { id }, data });
  else if (entity === "person") await db.bisneysPerson.update({ where: { id }, data });
  else if (entity === "job") await db.bisneysJob.update({ where: { id }, data });
  await bisneysAudit({ userId: user.id, action: "entity_restored", entityType: entity, entityId: id });
  revalidatePath("/bisneyscrm/settings/archive");
}
