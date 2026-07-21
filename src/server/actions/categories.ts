"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, slugify, fd, fdBool, fdNum } from "./helpers";
import { saveSeoFromForm } from "./seo";
import type { ContentStatus } from "@/generated/prisma/client";

/**
 * Fills per-language category slugs from the translated name, so Croatian post
 * URLs read /hr/ai-alati/... instead of /hr/ai-tools/...
 * Only touches translations still using the canonical slug — anything an editor
 * customised by hand is left alone. Collisions get a -2, -3 … suffix.
 */
export async function generateLocalizedCategorySlugs(): Promise<void> {
  const { userId } = await requirePermission("tools.manage");

  const categories = await db.category.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, translations: { select: { id: true, languageId: true, name: true, slug: true } } },
  });

  // Track used slugs per language so we never create a duplicate.
  const used = new Map<string, Set<string>>();
  for (const c of categories) {
    for (const t of c.translations) {
      if (!used.has(t.languageId)) used.set(t.languageId, new Set());
      used.get(t.languageId)!.add(t.slug);
    }
  }

  let changed = 0;
  for (const c of categories) {
    for (const t of c.translations) {
      // Leave hand-picked slugs untouched.
      if (t.slug !== c.slug) continue;
      const base = slugify(t.name);
      if (!base || base === t.slug) continue;

      const taken = used.get(t.languageId)!;
      let candidate = base;
      let n = 2;
      while (taken.has(candidate)) candidate = `${base}-${n++}`;

      await db.categoryTranslation.update({ where: { id: t.id }, data: { slug: candidate } });
      taken.delete(t.slug);
      taken.add(candidate);
      changed++;
    }
  }

  await audit({ userId, action: "UPDATE", entityType: "CATEGORY", entityId: "bulk-slugs", details: { changed } });
  revalidatePath("/administracija/categories");
  revalidatePath("/", "layout");
}

export async function createCategory(form: FormData) {
  const { userId } = await requirePermission("tools.manage");
  const name = fd(form, "name");
  if (!name) throw new Error("Name is required");
  const slug = slugify(fd(form, "slug") || name);

  const category = await db.category.create({ data: { slug } });
  // Create the name for every enabled language as a starting point.
  const languages = await db.language.findMany({ where: { isEnabled: true } });
  for (const lang of languages) {
    await db.categoryTranslation.create({
      data: { categoryId: category.id, languageId: lang.id, name, slug },
    });
  }
  await audit({ userId, action: "CREATE", entityType: "CATEGORY", entityId: category.id });
  redirect(`/administracija/categories/${category.id}`);
}

export async function saveCategory(categoryId: string, languageId: string, form: FormData) {
  const { userId } = await requirePermission("tools.manage");

  await db.category.update({
    where: { id: categoryId },
    data: {
      slug: slugify(fd(form, "slug")),
      icon: fd(form, "icon") || null,
      isFeatured: fdBool(form, "isFeatured"),
      position: fdNum(form, "position") ?? 0,
      status: (fd(form, "status") || "PUBLISHED") as ContentStatus,
      parentCategoryId: fd(form, "parentCategoryId") || null,
    },
  });

  const trName = fd(form, "tr_name");
  if (trName) {
    const data = {
      name: trName,
      slug: slugify(fd(form, "tr_slug") || trName),
      description: fd(form, "tr_description") || null,
    };
    await db.categoryTranslation.upsert({
      where: { categoryId_languageId: { categoryId, languageId } },
      create: { categoryId, languageId, ...data },
      update: data,
    });
  }

  await saveSeoFromForm(form, "CATEGORY", categoryId, languageId);
  await audit({ userId, action: "UPDATE", entityType: "CATEGORY", entityId: categoryId });
  revalidatePath("/", "layout");
}

export async function deleteCategory(categoryId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.category.update({
    where: { id: categoryId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  await audit({ userId, action: "DELETE", entityType: "CATEGORY", entityId: categoryId });
  revalidatePath("/administracija/categories");
}
