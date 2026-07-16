"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { runAlerts } from "@/lib/bisneyscrm/alerts";
import type { BisneysNotificationStatus } from "@/generated/prisma/client";

export async function refreshAlerts(): Promise<void> {
  await requireBisneysUser();
  await runAlerts();
  revalidatePath("/bisneyscrm/notifications");
}

export async function setNotificationStatus(id: string, status: BisneysNotificationStatus): Promise<void> {
  await requireBisneysUser();
  await db.bisneysNotification.update({
    where: { id },
    data: { status, resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null },
  });
  revalidatePath("/bisneyscrm/notifications");
}
