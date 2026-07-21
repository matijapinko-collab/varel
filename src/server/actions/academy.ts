"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission } from "./helpers";
import { ACADEMY_ROOT, ACADEMY_TOPICS } from "@/lib/academy/config";

/**
 * Creates the Academy root category and its 15 topics, in every enabled
 * language. Idempotent: matches on the canonical slug, so running it twice
 * updates names instead of duplicating rows, and it never overwrites a slug an
 * editor changed by hand.
 *
 * Lives as an admin action rather than a seed script because the production
 * database is not reachable from the CLI on this project.
 */
export async function seedAcademyCategories(): Promise<void> {
  const { userId } = await requirePermission("tools.manage");

  const languages = await db.language.findMany({ where: { isEnabled: true } });
  const hr = languages.find((l) => l.code === "hr");
  const en = languages.find((l) => l.code === "en");

  // The root's slug is what every Academy post URL is built from, so it has to
  // exist before anything references it.
  const root = await upsertCategory({
    canonicalSlug: ACADEMY_ROOT.enSlug,
    position: 0,
    isFeatured: true,
  });
  await upsertTranslations(root.id, ACADEMY_ROOT);

  let created = 0;
  for (const [i, topic] of ACADEMY_TOPICS.entries()) {
    const category = await upsertCategory({
      canonicalSlug: topic.enSlug,
      position: i + 1,
      parentCategoryId: root.id,
    });
    if (category.wasCreated) created++;
    await upsertTranslations(category.id, topic);
  }

  await audit({
    userId,
    action: "CREATE",
    entityType: "CATEGORY",
    entityId: "academy-seed",
    details: { created, topics: ACADEMY_TOPICS.length },
  });
  revalidatePath("/administracija/categories");
  revalidatePath("/", "layout");

  async function upsertTranslations(
    categoryId: string,
    t: { hr: string; en: string; hrSlug: string; enSlug: string }
  ) {
    for (const [lang, name, slug] of [
      [hr, t.hr, t.hrSlug],
      [en, t.en, t.enSlug],
    ] as const) {
      if (!lang) continue;
      const existing = await db.categoryTranslation.findUnique({
        where: { categoryId_languageId: { categoryId, languageId: lang.id } },
        select: { id: true },
      });
      if (existing) {
        // Refresh the name, leave the slug alone — it may be live in a URL.
        await db.categoryTranslation.update({ where: { id: existing.id }, data: { name } });
      } else {
        await db.categoryTranslation.create({
          data: { categoryId, languageId: lang.id, name, slug },
        });
      }
    }
  }
}

async function upsertCategory(input: {
  canonicalSlug: string;
  position: number;
  parentCategoryId?: string;
  isFeatured?: boolean;
}): Promise<{ id: string; wasCreated: boolean }> {
  const existing = await db.category.findUnique({
    where: { slug: input.canonicalSlug },
    select: { id: true },
  });
  if (existing) {
    await db.category.update({
      where: { id: existing.id },
      data: { deletedAt: null, status: "PUBLISHED", parentCategoryId: input.parentCategoryId ?? null },
    });
    return { id: existing.id, wasCreated: false };
  }
  const created = await db.category.create({
    data: {
      slug: input.canonicalSlug,
      position: input.position,
      isFeatured: input.isFeatured ?? false,
      status: "PUBLISHED",
      parentCategoryId: input.parentCategoryId ?? null,
    },
    select: { id: true },
  });
  return { id: created.id, wasCreated: true };
}
