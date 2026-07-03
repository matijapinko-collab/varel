"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, slugify, fd, fdBool, fdNum } from "./helpers";
import { saveSeoFromForm } from "./seo";
import type { ContentStatus } from "@/generated/prisma/client";

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
  redirect(`/admin/categories/${category.id}`);
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
  revalidatePath("/admin/categories");
}
