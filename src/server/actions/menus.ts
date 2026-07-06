"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, fdLines } from "./helpers";

/**
 * Menus are edited as simple "Label | URL" lines per menu.
 * Every language has its own HEADER and FOOTER menu.
 */
export async function saveMenu(menuId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const lines = fdLines(form, "items");

  await db.menuItem.deleteMany({ where: { menuId } });
  let position = 0;
  for (const line of lines) {
    const [label, ...rest] = line.split("|");
    const url = rest.join("|").trim();
    if (!label?.trim() || !url) continue;
    await db.menuItem.create({
      data: {
        menuId,
        label: label.trim(),
        url,
        position: position++,
        isExternal: url.startsWith("http"),
        openInNewTab: url.startsWith("http"),
      },
    });
  }
  await audit({ userId, action: "UPDATE", entityType: "MENU", entityId: menuId });
  revalidatePath("/", "layout");
}

export async function ensureMenus() {
  await requirePermission("content.edit");
  const languages = await db.language.findMany({ where: { isEnabled: true } });
  for (const lang of languages) {
    for (const location of ["HEADER", "FOOTER"] as const) {
      await db.menu.upsert({
        where: { location_languageId: { location, languageId: lang.id } },
        create: { name: `${location} (${lang.code})`, location, languageId: lang.id },
        update: {},
      });
    }
  }
  revalidatePath("/administracija/menus");
}
