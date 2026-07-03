"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { deleteFile } from "@/lib/storage";
import { requirePermission, fd } from "./helpers";

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
  revalidatePath("/admin/media");
}

export async function deleteMedia(mediaId: string) {
  const { userId } = await requirePermission("media.manage");
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return;
  await db.media.update({
    where: { id: mediaId },
    data: { deletedAt: new Date() },
  });
  // Keep branding/seed assets in storage; delete uploaded files.
  if (media.storageKey.startsWith("media/")) {
    await deleteFile(media.storageKey);
  }
  await audit({ userId, action: "MEDIA_DELETE", entityType: "MEDIA", entityId: mediaId });
  revalidatePath("/admin/media");
}
