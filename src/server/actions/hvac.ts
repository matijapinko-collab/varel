"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, fd } from "./helpers";
import type { HvacLeadStatus } from "@/generated/prisma/client";

const STATUSES: HvacLeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "BETA_CANDIDATE", "NOT_INTERESTED", "CONVERTED"];

export async function updateHvacLeadStatus(id: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = fd(form, "status") as HvacLeadStatus;
  if (!STATUSES.includes(status)) return;
  await db.hvacLead.update({ where: { id }, data: { status } });
  await audit({ userId, action: "UPDATE", entityType: "HVAC_LEAD", entityId: id, details: { status } });
  revalidatePath("/administracija/hvac");
}
