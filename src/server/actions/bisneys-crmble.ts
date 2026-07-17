"use server";

import { revalidatePath } from "next/cache";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { previewCrmbleImport, runCrmbleImport, type CrmbleRow } from "@/lib/bisneyscrm/crmble/import";

export async function previewCrmbleImportAction(rows: CrmbleRow[]) {
  await requireBisneysUser();
  return previewCrmbleImport(rows);
}

export async function runCrmbleImportAction(rows: CrmbleRow[]) {
  const user = await requireBisneysUser();
  const res = await runCrmbleImport(rows, user.id);
  await bisneysAudit({ userId: user.id, action: "crmble_imported", entityType: "company", after: res });
  revalidatePath("/bisneyscrm/companies");
  revalidatePath("/bisneyscrm/contacts");
  return res;
}
