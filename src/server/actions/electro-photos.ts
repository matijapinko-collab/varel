"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject } from "@/lib/electro/project-access";
import { validateUpload, ELECTRO_ALLOWED_PHOTO_MIME } from "@/lib/electro/documents";
import { electroAudit } from "@/lib/electro/audit";

/**
 * Work photos (brief §29). Any project member (or admin/engineer) may add
 * photos; the original bytes are preserved and metadata is stored structurally,
 * not just burned into the image. Scoped to tenant + project access.
 */

const PHOTOS_PATH = `${ELECTRO_APP_BASE}/fotografije`;

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type ElectroPhotoResult = { error?: string; ok?: boolean };

export async function electroUploadPhoto(
  _prev: ElectroPhotoResult,
  form: FormData
): Promise<ElectroPhotoResult> {
  const ctx = await requireElectroContext();
  const projectId = f(form, "projectId");
  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Odaberite fotografiju." };
  const mime = file.type || "application/octet-stream";
  const invalid = validateUpload(mime, file.size, ELECTRO_ALLOWED_PHOTO_MIME);
  if (invalid) return { error: invalid };

  // Optional structured links, validated against the project.
  const locationId = f(form, "locationId") || null;
  if (locationId && !(await db.electroProjectLocation.findFirst({ where: { id: locationId, projectId: project.id } }))) {
    return { error: "Lokacija ne pripada projektu." };
  }
  const phaseId = f(form, "phaseId") || null;
  if (phaseId && !(await db.electroProjectPhase.findFirst({ where: { id: phaseId, projectId: project.id } }))) {
    return { error: "Faza ne pripada projektu." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `electro/${ctx.company.id}/${project.id}/photos/${checksum.slice(0, 16)}_${safeName}`;

  let stored: { url: string; storageKey: string };
  try {
    stored = await uploadFile(key, buffer, mime);
  } catch (e) {
    return { error: `Učitavanje nije uspjelo: ${(e as Error).message}` };
  }

  const photo = await db.electroPhoto.create({
    data: {
      companyId: ctx.company.id,
      projectId: project.id,
      locationId,
      phaseId,
      category: f(form, "category") || null,
      storageKey: stored.storageKey,
      url: stored.url,
      fileName: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      comment: f(form, "comment") || null,
      takenByUserId: ctx.user.id,
    },
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "photo_uploaded", entityType: "photo", entityId: photo.id });
  revalidatePath(`${PHOTOS_PATH}`);
  revalidatePath(`${ELECTRO_APP_BASE}/projekti/${project.id}`);
  return { ok: true };
}
