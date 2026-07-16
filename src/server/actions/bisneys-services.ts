"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { str, opt, decStr, boolOf } from "@/lib/bisneyscrm/forms";

export type SaveResult = { error?: string };

export async function saveService(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  const user = await requireBisneysUser();
  const id = opt(form.get("id"));
  const name = str(form.get("name"));
  if (!name) return { error: "Naziv usluge je obavezan." };

  const data = {
    name,
    description: opt(form.get("description")),
    isActive: boolOf(form.get("isActive")),
    basePrice: decStr(form.get("basePrice")),
    currency: opt(form.get("currency")) ?? "EUR",
    billingModel: opt(form.get("billingModel")),
    color: opt(form.get("color")),
    icon: opt(form.get("icon")),
  };

  if (id) {
    await db.bisneysService.update({ where: { id }, data });
    await bisneysAudit({ userId: user.id, action: "service_updated", entityType: "service", entityId: id, after: { name } });
  } else {
    const created = await db.bisneysService.create({ data });
    await bisneysAudit({ userId: user.id, action: "service_created", entityType: "service", entityId: created.id, after: { name } });
  }
  redirect("/bisneyscrm/services");
}

export async function toggleService(id: string): Promise<void> {
  await requireBisneysUser();
  const s = await db.bisneysService.findUnique({ where: { id }, select: { isActive: true } });
  if (s) await db.bisneysService.update({ where: { id }, data: { isActive: !s.isActive } });
  redirect("/bisneyscrm/services");
}
