"use server";

import { revalidatePath } from "next/cache";
import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { ensureProfessionCatalogue } from "@/lib/bisneyscrm/candidates/profession-seed";

export async function seedProfessionCatalogue(): Promise<void> {
  const user = await requireBisneysSuperadmin();
  const res = await ensureProfessionCatalogue();
  await bisneysAudit({ userId: user.id, action: "profession_catalogue_seeded", entityType: "profession", after: { ...res } });
  revalidatePath("/bisneyscrm/professions");
}
