"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { deleteFile } from "@/lib/storage";
import { requirePermission, fd } from "./helpers";

/**
 * Register an externally-hosted image by URL (no upload). Works regardless of
 * the storage provider — useful when uploads are disabled or for images that
 * already live elsewhere.
 */
export async function addMediaByUrl(form: FormData) {
  const { userId } = await requirePermission("media.manage");
  const url = fd(form, "url");
  if (!/^https?:\/\/.+/i.test(url)) {
    throw new Error("Enter a valid image URL starting with http(s)://");
  }
  const filename = url.split("/").pop()?.split("?")[0]?.slice(0, 120) || "external-image";
  const media = await db.media.create({
    data: {
      filename,
      originalFilename: filename,
      mimeType: "image/*",
      size: 0,
      url,
      storageKey: url, // external URL; not deletable from our storage
      altText: fd(form, "altText") || null,
      title: fd(form, "title") || null,
      uploadedById: userId,
    },
  });
  await audit({ userId, action: "MEDIA_UPLOAD", entityType: "MEDIA", entityId: media.id, details: { external: true } });
  revalidatePath("/administracija/media");
}

export async function updateMedia(mediaId: string, form: FormData) {
  const { userId } = await requirePermission("media.manage");
  await db.media.update({
    where: { id: mediaId },
    data: {
      altText: fd(form, "altText") || null,
      caption: fd(form, "caption") || null,
      title: fd(form, "title") || null,
    },
  });
  await audit({ userId, action: "UPDATE", entityType: "MEDIA", entityId: mediaId });
  revalidatePath("/administracija/media");
}

export async function deleteMedia(mediaId: string) {
  const { userId } = await requirePermission("media.manage");
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return;
  await db.media.update({
    where: { id: mediaId },
    data: { deletedAt: new Date() },
  });
  // Delete the stored file for real uploads (Blob URL, R2 key, or local file),
  // but never touch seeded local branding assets or externally-hosted images
  // that we don't own.
  const isSeedBranding = media.storageKey.startsWith("branding/");
  const isExternalOnly =
    media.mimeType === "image/*" && media.storageKey === media.url && media.size === 0;
  if (!isSeedBranding && !isExternalOnly) {
    await deleteFile(media.storageKey);
  }
  await audit({ userId, action: "MEDIA_DELETE", entityType: "MEDIA", entityId: mediaId });
  revalidatePath("/administracija/media");
}
