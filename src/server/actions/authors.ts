"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { setSetting } from "@/lib/settings";
import { CONTENT_SETTINGS_KEY, getContentSettings } from "@/lib/authors";
import { requirePermission, fd, fdBool, slugify, ActionError } from "./helpers";

/** Split a textarea/comma list into a clean string array. */
function tagList(form: FormData, key: string): string[] {
  return fd(form, key)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function readAuthorForm(form: FormData) {
  const internalName = fd(form, "internalName");
  const displayNameEn = fd(form, "displayNameEn") || internalName;
  const displayNameHr = fd(form, "displayNameHr") || internalName;
  const slugEn = slugify(fd(form, "slugEn") || displayNameEn);
  const slugHr = slugify(fd(form, "slugHr") || displayNameHr);

  if (!internalName) throw new ActionError("Internal name is required.");
  if (!slugEn || !slugHr) throw new ActionError("Both English and Croatian slugs are required.");
  if (!fd(form, "bioShortEn") && !fd(form, "bioShortHr")) {
    throw new ActionError("At least one short bio (EN or HR) is required.");
  }

  return {
    internalName,
    displayNameEn,
    displayNameHr,
    slugEn,
    slugHr,
    roleEn: fd(form, "roleEn") || null,
    roleHr: fd(form, "roleHr") || null,
    bioShortEn: fd(form, "bioShortEn") || null,
    bioShortHr: fd(form, "bioShortHr") || null,
    bioLongEn: fd(form, "bioLongEn") || null,
    bioLongHr: fd(form, "bioLongHr") || null,
    photoUrl: fd(form, "photoUrl") || null,
    photoAltEn: fd(form, "photoAltEn") || null,
    photoAltHr: fd(form, "photoAltHr") || null,
    aboutPhotoUrl: fd(form, "aboutPhotoUrl") || null,
    aboutPhotoAltEn: fd(form, "aboutPhotoAltEn") || null,
    aboutPhotoAltHr: fd(form, "aboutPhotoAltHr") || null,
    email: fd(form, "email") || null,
    websiteUrl: fd(form, "websiteUrl") || null,
    linkedinUrl: fd(form, "linkedinUrl") || null,
    xUrl: fd(form, "xUrl") || null,
    instagramUrl: fd(form, "instagramUrl") || null,
    youtubeUrl: fd(form, "youtubeUrl") || null,
    githubUrl: fd(form, "githubUrl") || null,
    expertiseTagsEnJson: tagList(form, "expertiseTagsEn"),
    expertiseTagsHrJson: tagList(form, "expertiseTagsHr"),
    defaultLanguage: fd(form, "defaultLanguage") === "en" ? "en" : "hr",
    isActive: fdBool(form, "isActive"),
  };
}

/** Ensure only one default author, and mirror it into content settings. */
async function applyDefault(authorId: string, makeDefault: boolean) {
  if (makeDefault) {
    await db.author.updateMany({ where: { id: { not: authorId } }, data: { isDefault: false } });
    await db.author.update({ where: { id: authorId }, data: { isDefault: true } });
    const settings = await getContentSettings();
    await setSetting(CONTENT_SETTINGS_KEY, { ...settings, defaultAuthorId: authorId });
  } else {
    await db.author.update({ where: { id: authorId }, data: { isDefault: false } });
  }
}

export async function createAuthor(form: FormData) {
  const { userId } = await requirePermission("content.create");
  const data = readAuthorForm(form);
  const makeDefault = fdBool(form, "isDefault");
  const isFirst = (await db.author.count()) === 0;

  const author = await db.author.create({ data });
  await applyDefault(author.id, makeDefault || isFirst);
  await audit({ userId, action: "CREATE", entityType: "AUTHOR", entityId: author.id, details: { internalName: author.internalName } });
  revalidatePath("/administracija/authors");
  revalidatePath("/", "layout");
  redirect(`/administracija/authors/${author.id}/edit?saved=1`);
}

export async function updateAuthor(id: string, form: FormData) {
  const { userId } = await requirePermission("content.edit");
  const data = readAuthorForm(form);
  await db.author.update({ where: { id }, data });
  await applyDefault(id, fdBool(form, "isDefault"));
  await audit({ userId, action: "UPDATE", entityType: "AUTHOR", entityId: id });
  revalidatePath("/administracija/authors");
  revalidatePath(`/administracija/authors/${id}/edit`);
  revalidatePath("/", "layout");
  redirect(`/administracija/authors/${id}/edit?saved=1`);
}

export async function setDefaultAuthor(id: string) {
  const { userId } = await requirePermission("content.edit");
  await db.author.update({ where: { id }, data: { isActive: true } });
  await applyDefault(id, true);
  await audit({ userId, action: "UPDATE", entityType: "AUTHOR", entityId: id, details: { setDefault: true } });
  revalidatePath("/administracija/authors");
  revalidatePath("/", "layout");
}

export async function toggleAuthorActive(id: string) {
  const { userId } = await requirePermission("content.edit");
  const author = await db.author.findUnique({ where: { id } });
  if (!author) return;
  if (author.isDefault && author.isActive) {
    throw new ActionError("Set another author as default before deactivating the default author.");
  }
  await db.author.update({ where: { id }, data: { isActive: !author.isActive } });
  await audit({ userId, action: "UPDATE", entityType: "AUTHOR", entityId: id, details: { isActive: !author.isActive } });
  revalidatePath("/administracija/authors");
  revalidatePath("/", "layout");
}
