"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject, canManageProjects } from "@/lib/electro/project-access";
import {
  categoryRequiresApproval,
  nextVersionLabel,
  validateUpload,
  ELECTRO_ALLOWED_DOC_MIME,
  ELECTRO_DOC_CATEGORY_LABELS,
} from "@/lib/electro/documents";
import { electroAudit } from "@/lib/electro/audit";
import type { ElectroDocCategory, ElectroVisibility } from "@/generated/prisma/client";

/**
 * Document center (brief §22–§25). Uploading a new version NEVER overwrites the
 * old one; each version is its own row. Only an engineer's approval promotes a
 * version to the valid working document. Everything is scoped to the tenant and
 * to the project's access rules.
 */

const DOCS_PATH = `${ELECTRO_APP_BASE}/dokumenti`;
const VALID_CATEGORIES = new Set(Object.keys(ELECTRO_DOC_CATEGORY_LABELS)) as Set<ElectroDocCategory>;
const VALID_VISIBILITY = new Set<ElectroVisibility>(["INTERNAL", "PROJECT_TEAM", "INVESTOR", "PUBLIC_LINK"]);

function f(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function bufferFrom(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

export type ElectroDocResult = { error?: string; ok?: boolean };

/** Create a new document with its first version (brief §22, §25). */
export async function electroUploadDocument(
  _prev: ElectroDocResult,
  form: FormData
): Promise<ElectroDocResult> {
  const ctx = await requireElectroContext();
  const projectId = f(form, "projectId");

  const project = await loadAccessibleProject(ctx, projectId);
  if (!project) return { error: "Projekt nije pronađen." };

  const title = f(form, "title");
  if (!title) return { error: "Naziv dokumenta je obavezan." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Odaberite datoteku." };
  const mime = file.type || "application/octet-stream";
  const invalid = validateUpload(mime, file.size, ELECTRO_ALLOWED_DOC_MIME);
  if (invalid) return { error: invalid };

  const categoryRaw = f(form, "category") as ElectroDocCategory;
  const category = VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : "OTHER";
  const visRaw = f(form, "visibility") as ElectroVisibility;
  const visibility = VALID_VISIBILITY.has(visRaw) ? visRaw : "INTERNAL";
  const requiresApproval = categoryRequiresApproval(category);

  const buffer = await bufferFrom(file);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `electro/${ctx.company.id}/${project.id}/docs/${checksum.slice(0, 16)}_${safeName}`;

  let stored: { url: string; storageKey: string };
  try {
    stored = await uploadFile(key, buffer, mime);
  } catch (e) {
    return { error: `Učitavanje nije uspjelo: ${(e as Error).message}` };
  }

  const doc = await db.$transaction(async (tx) => {
    const d = await tx.electroDocument.create({
      data: {
        companyId: ctx.company.id,
        projectId: project.id,
        category,
        title,
        description: f(form, "description") || null,
        visibility,
        requiresApproval,
        status: requiresApproval ? "UNDER_REVIEW" : "APPROVED",
        createdByUserId: ctx.user.id,
      },
    });
    const version = await tx.electroDocumentVersion.create({
      data: {
        documentId: d.id,
        versionLabel: "1.0",
        fileName: file.name,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: mime,
        sizeBytes: file.size,
        checksum,
        changeNote: f(form, "changeNote") || "Prva verzija",
        status: requiresApproval ? "UNDER_REVIEW" : "APPROVED",
        uploadedByUserId: ctx.user.id,
        approvedByUserId: requiresApproval ? null : ctx.user.id,
        approvedAt: requiresApproval ? null : new Date(),
      },
    });
    // Non-technical docs are immediately the valid version.
    await tx.electroDocument.update({ where: { id: d.id }, data: { currentVersionId: version.id } });
    return d;
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "document_uploaded", entityType: "document", entityId: doc.id, after: { title, category, requiresApproval } });
  redirect(`${DOCS_PATH}/${doc.id}`);
}

/** Upload a new version of an existing document (brief §25 — old stays intact). */
export async function electroUploadNewVersion(
  _prev: ElectroDocResult,
  form: FormData
): Promise<ElectroDocResult> {
  const ctx = await requireElectroContext();
  const documentId = f(form, "documentId");

  const doc = await db.electroDocument.findFirst({
    where: { id: documentId, companyId: ctx.company.id },
    include: { currentVersion: true, project: true },
  });
  if (!doc || !doc.projectId) return { error: "Dokument nije pronađen." };
  if (!(await loadAccessibleProject(ctx, doc.projectId))) return { error: "Nemate pristup projektu dokumenta." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Odaberite datoteku." };
  const mime = file.type || "application/octet-stream";
  const invalid = validateUpload(mime, file.size, ELECTRO_ALLOWED_DOC_MIME);
  if (invalid) return { error: invalid };

  const buffer = await bufferFrom(file);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `electro/${ctx.company.id}/${doc.projectId}/docs/${checksum.slice(0, 16)}_${safeName}`;

  let stored: { url: string; storageKey: string };
  try {
    stored = await uploadFile(key, buffer, mime);
  } catch (e) {
    return { error: `Učitavanje nije uspjelo: ${(e as Error).message}` };
  }

  const label = nextVersionLabel(doc.currentVersion?.versionLabel ?? null, doc.status === "APPROVED");

  await db.$transaction(async (tx) => {
    await tx.electroDocumentVersion.create({
      data: {
        documentId: doc.id,
        versionLabel: label,
        fileName: file.name,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: mime,
        sizeBytes: file.size,
        checksum,
        changeNote: f(form, "changeNote") || `Verzija ${label}`,
        status: doc.requiresApproval ? "UNDER_REVIEW" : "APPROVED",
        uploadedByUserId: ctx.user.id,
      },
    });
    // A technical doc goes back under review; the OLD approved version stays
    // valid until the new one is approved (brief §25). A non-technical doc
    // publishes immediately.
    if (doc.requiresApproval) {
      await tx.electroDocument.update({ where: { id: doc.id }, data: { status: "UNDER_REVIEW" } });
    } else {
      const v = await tx.electroDocumentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { createdAt: "desc" } });
      if (v) await tx.electroDocument.update({ where: { id: doc.id }, data: { currentVersionId: v.id, status: "APPROVED" } });
    }
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "document_version_uploaded", entityType: "document", entityId: doc.id, after: { version: label } });
  revalidatePath(`${DOCS_PATH}/${doc.id}`);
  return { ok: true };
}

/** Engineer/admin approval decision on the latest under-review version (brief §24). */
export async function electroDecideDocument(
  _prev: ElectroDocResult,
  form: FormData
): Promise<ElectroDocResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Samo inženjer ili administrator može odobravati dokumentaciju." };
  const documentId = f(form, "documentId");
  const decision = f(form, "decision"); // APPROVED | REJECTED | CHANGES_REQUIRED

  const doc = await db.electroDocument.findFirst({
    where: { id: documentId, companyId: ctx.company.id },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!doc || !doc.projectId) return { error: "Dokument nije pronađen." };
  if (!(await loadAccessibleProject(ctx, doc.projectId))) return { error: "Nemate pristup." };
  const latest = doc.versions[0];
  if (!latest) return { error: "Dokument nema verziju za odluku." };
  if (!["APPROVED", "REJECTED", "CHANGES_REQUIRED"].includes(decision)) return { error: "Nepoznata odluka." };

  await db.$transaction(async (tx) => {
    await tx.electroDocumentApproval.create({
      data: { documentId: doc.id, versionId: latest.id, decision: decision as never, comment: f(form, "comment") || null, decidedByUserId: ctx.user.id },
    });
    if (decision === "APPROVED") {
      // Supersede the previous current version, promote this one.
      if (doc.currentVersionId && doc.currentVersionId !== latest.id) {
        await tx.electroDocumentVersion.update({ where: { id: doc.currentVersionId }, data: { status: "SUPERSEDED" } });
      }
      await tx.electroDocumentVersion.update({ where: { id: latest.id }, data: { status: "APPROVED", approvedByUserId: ctx.user.id, approvedAt: new Date() } });
      await tx.electroDocument.update({ where: { id: doc.id }, data: { status: "APPROVED", currentVersionId: latest.id } });
    } else {
      const vStatus = decision === "REJECTED" ? "REJECTED" : "CHANGES_REQUIRED";
      await tx.electroDocumentVersion.update({ where: { id: latest.id }, data: { status: vStatus as never } });
      await tx.electroDocument.update({ where: { id: doc.id }, data: { status: vStatus as never } });
    }
  });

  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "document_decision", entityType: "document", entityId: doc.id, after: { decision } });
  revalidatePath(`${DOCS_PATH}/${doc.id}`);
  return { ok: true };
}

export async function electroSetDocumentVisibility(
  _prev: ElectroDocResult,
  form: FormData
): Promise<ElectroDocResult> {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) return { error: "Nemate ovlast." };
  const documentId = f(form, "documentId");
  const doc = await db.electroDocument.findFirst({ where: { id: documentId, companyId: ctx.company.id } });
  if (!doc) return { error: "Dokument nije pronađen." };
  const visRaw = f(form, "visibility") as ElectroVisibility;
  if (!VALID_VISIBILITY.has(visRaw)) return { error: "Nepoznata vidljivost." };

  await db.electroDocument.update({ where: { id: doc.id }, data: { visibility: visRaw } });
  await electroAudit({ companyId: ctx.company.id, userId: ctx.user.id, action: "document_visibility_changed", entityType: "document", entityId: doc.id, after: { visibility: visRaw } });
  revalidatePath(`${DOCS_PATH}/${doc.id}`);
  return { ok: true };
}
