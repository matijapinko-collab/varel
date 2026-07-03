"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, slugify, fd, fdBool } from "./helpers";
import { saveSeoFromForm } from "./seo";
import type { ContentStatus, Prisma } from "@/generated/prisma/client";

export async function createPage(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const title = fd(form, "title");
  const languageId = fd(form, "languageId");
  if (!title || !languageId) throw new Error("Title and language are required");

  const page = await db.page.create({
    data: {
      languageId,
      title,
      slug: slugify(fd(form, "slug") || title),
      template: "builder",
      createdById: userId,
    },
  });
  await audit({ userId, action: "CREATE", entityType: "PAGE", entityId: page.id });
  redirect(`/admin/pages/${page.id}`);
}

export async function savePageSettings(pageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const status = (fd(form, "status") || "DRAFT") as ContentStatus;
  const isHomepage = fdBool(form, "isHomepage");

  const page = await db.page.update({
    where: { id: pageId },
    data: {
      title: fd(form, "title"),
      slug: slugify(fd(form, "slug") || fd(form, "title")),
      status,
      isHomepage,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      updatedById: userId,
    },
  });

  // Only one homepage per language.
  if (isHomepage) {
    await db.page.updateMany({
      where: { languageId: page.languageId, isHomepage: true, id: { not: pageId } },
      data: { isHomepage: false },
    });
  }

  await saveSeoFromForm(form, "PAGE", pageId, page.languageId);
  await audit({ userId, action: "UPDATE", entityType: "PAGE", entityId: pageId });
  revalidatePath("/", "layout");
}

export async function deletePage(pageId: string) {
  const { userId } = await requirePermission("content.delete");
  await db.page.update({
    where: { id: pageId },
    data: { deletedAt: new Date(), status: "ARCHIVED", isHomepage: false },
  });
  await audit({ userId, action: "DELETE", entityType: "PAGE", entityId: pageId });
  revalidatePath("/admin/pages");
}

/* ---------------- Blocks (page builder) ---------------- */

export async function addBlock(pageId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const type = fd(form, "type");
  if (!type) throw new Error("Block type required");
  const last = await db.pageBlock.findFirst({
    where: { pageId, parentBlockId: null },
    orderBy: { position: "desc" },
  });
  await db.pageBlock.create({
    data: {
      pageId,
      type: type === "global_section" ? "global_section" : type,
      globalSectionId: type === "global_section" ? fd(form, "globalSectionId") || null : null,
      position: (last?.position ?? -1) + 1,
      contentJson: {},
      settingsJson: {},
    },
  });
  await audit({ userId, action: "UPDATE", entityType: "PAGE", entityId: pageId, details: { addedBlock: type } });
  revalidatePath(`/admin/pages/${pageId}`);
}

/** Saves a block using the friendly per-field form generated from BLOCK_SCHEMAS. */
export async function saveBlockFields(blockId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const { getBlockSchema } = await import("@/lib/blocks-schema");
  const { fdLines, fdFaq } = await import("./helpers");

  const block = await db.pageBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new Error("Block not found");
  const schema = getBlockSchema(block.type);
  if (!schema) throw new Error(`No schema for block type ${block.type}`);

  const content: Record<string, unknown> = {};
  const settings: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const bucket = field.target === "content" ? content : settings;
    switch (field.kind) {
      case "lines":
        bucket[field.key] = fdLines(form, field.key);
        break;
      case "faq":
        bucket[field.key] = fdFaq(form, field.key);
        break;
      case "pairs":
        bucket[field.key] = fdLines(form, field.key).map((line) => {
          const [value, ...rest] = line.split("|");
          return { value: value?.trim() ?? "", label: rest.join("|").trim() };
        });
        break;
      case "number": {
        const n = Number(fd(form, field.key));
        if (Number.isFinite(n) && fd(form, field.key) !== "") bucket[field.key] = n;
        break;
      }
      case "boolean":
        bucket[field.key] = fd(form, field.key) === "true";
        break;
      default:
        bucket[field.key] = fd(form, field.key);
    }
  }

  await db.pageBlock.update({
    where: { id: blockId },
    data: {
      contentJson: content as Prisma.InputJsonValue,
      settingsJson: settings as Prisma.InputJsonValue,
    },
  });
  await audit({ userId, action: "UPDATE", entityType: "PAGE_BLOCK", entityId: blockId });
  if (block.pageId) revalidatePath(`/admin/pages/${block.pageId}`);
  revalidatePath("/", "layout");
}

export async function saveBlock(blockId: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");

  let contentJson: Prisma.InputJsonValue = {};
  let settingsJson: Prisma.InputJsonValue = {};
  try {
    contentJson = JSON.parse(fd(form, "contentJson") || "{}");
    settingsJson = JSON.parse(fd(form, "settingsJson") || "{}");
  } catch {
    throw new Error("Invalid JSON in block configuration");
  }

  const block = await db.pageBlock.update({
    where: { id: blockId },
    data: { contentJson, settingsJson },
  });
  await audit({ userId, action: "UPDATE", entityType: "PAGE_BLOCK", entityId: blockId });
  revalidatePath(`/admin/pages/${block.pageId}`);
  revalidatePath("/", "layout");
}

export async function moveBlock(blockId: string, direction: "up" | "down") {
  await requirePermission("content.edit");
  const block = await db.pageBlock.findUnique({ where: { id: blockId } });
  if (!block?.pageId) return;

  const siblings = await db.pageBlock.findMany({
    where: { pageId: block.pageId, parentBlockId: null },
    orderBy: { position: "asc" },
  });
  const index = siblings.findIndex((b) => b.id === blockId);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return;

  await db.$transaction([
    db.pageBlock.update({ where: { id: block.id }, data: { position: swapWith.position } }),
    db.pageBlock.update({ where: { id: swapWith.id }, data: { position: block.position } }),
  ]);
  revalidatePath(`/admin/pages/${block.pageId}`);
  revalidatePath("/", "layout");
}

export async function toggleBlockHidden(blockId: string) {
  await requirePermission("content.edit");
  const block = await db.pageBlock.findUnique({ where: { id: blockId } });
  if (!block) return;
  await db.pageBlock.update({
    where: { id: blockId },
    data: { isHidden: !block.isHidden },
  });
  revalidatePath(`/admin/pages/${block.pageId}`);
  revalidatePath("/", "layout");
}

export async function duplicateBlock(blockId: string) {
  await requirePermission("content.edit");
  const block = await db.pageBlock.findUnique({ where: { id: blockId } });
  if (!block?.pageId) return;
  await db.pageBlock.updateMany({
    where: { pageId: block.pageId, position: { gt: block.position } },
    data: { position: { increment: 1 } },
  });
  await db.pageBlock.create({
    data: {
      pageId: block.pageId,
      type: block.type,
      globalSectionId: block.globalSectionId,
      position: block.position + 1,
      contentJson: (block.contentJson ?? {}) as Prisma.InputJsonValue,
      settingsJson: (block.settingsJson ?? {}) as Prisma.InputJsonValue,
      isHidden: block.isHidden,
    },
  });
  revalidatePath(`/admin/pages/${block.pageId}`);
}

export async function deleteBlock(blockId: string) {
  await requirePermission("content.edit");
  const block = await db.pageBlock.delete({ where: { id: blockId } });
  if (block.pageId) revalidatePath(`/admin/pages/${block.pageId}`);
  revalidatePath("/", "layout");
}
