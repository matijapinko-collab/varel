"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser, requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, dateOrNull } from "@/lib/bisneyscrm/forms";
import { createManualInteraction, backfillInteractionsFromComments } from "@/lib/bisneyscrm/interactions/service";
import type { InteractionType } from "@/lib/bisneyscrm/interactions/parse";

const MANUAL_TYPES: InteractionType[] = ["GENERAL_NOTE", "OUTBOUND_CALL", "INBOUND_CALL", "EMAIL", "MEETING_NOTE", "FOLLOW_UP", "PITCH", "CLIENT_FEEDBACK", "DEAL_NOTE"];

/** Adds a manual interaction (note / logged call / meeting) to a company. */
export async function addCompanyInteraction(companyId: string, form: FormData): Promise<void> {
  const user = await requireBisneysUser();
  const content = str(form.get("rawContent"));
  if (!content) return;
  const typeRaw = str(form.get("type"));
  const type = (MANUAL_TYPES.includes(typeRaw as InteractionType) ? typeRaw : "GENERAL_NOTE") as InteractionType;

  await createManualInteraction({
    companyId, type, rawContent: content, title: opt(form.get("title")),
    actorUserId: user.id, actorName: user.username, occurredAt: dateOrNull(form.get("occurredAt")),
  });
  await db.bisneysCompany.update({ where: { id: companyId }, data: { lastActivityAt: new Date() } }).catch(() => {});
  await bisneysAudit({ userId: user.id, action: "interaction_added", entityType: "company", entityId: companyId, after: { type } });
  revalidatePath(`/bisneyscrm/companies/${companyId}`);
}

/** Superadmin: backfill normalized interactions from existing Trello comments. */
export async function backfillInteractions(): Promise<void> {
  const user = await requireBisneysSuperadmin();
  const res = await backfillInteractionsFromComments();
  await bisneysAudit({ userId: user.id, action: "interactions_backfilled", entityType: "interaction", after: res });
  revalidatePath("/bisneyscrm/companies");
}
