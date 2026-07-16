import type {
  ElectroDocCategory,
  ElectroDocStatus,
  ElectroVisibility,
} from "@/generated/prisma/client";

/**
 * Document-center pure helpers (brief §22–§25). Db-free so they're testable and
 * usable on the client.
 */

export const ELECTRO_DOC_CATEGORY_LABELS: Record<ElectroDocCategory, string> = {
  CONTRACT: "Ugovor",
  OFFER: "Ponuda",
  INVOICE: "Račun",
  TECHNICAL_DRAWING: "Tehnički nacrt",
  SCHEME: "Shema",
  SPECIFICATION: "Specifikacija",
  SITE_REPORT: "Gradilišni izvještaj",
  CERTIFICATE: "Certifikat / atest",
  MEASUREMENT: "Mjerni protokol",
  HANDOVER: "Primopredaja",
  OTHER: "Ostalo",
};

export const ELECTRO_DOC_STATUS_LABELS: Record<ElectroDocStatus, string> = {
  DRAFT: "Nacrt",
  UPLOADED: "Učitano",
  UNDER_REVIEW: "Na pregledu",
  CHANGES_REQUIRED: "Potrebne izmjene",
  APPROVED: "Odobreno",
  REJECTED: "Odbijeno",
  SUPERSEDED: "Zamijenjeno",
  ARCHIVED: "Arhivirano",
};

export const ELECTRO_VISIBILITY_LABELS: Record<ElectroVisibility, string> = {
  INTERNAL: "Interno",
  PROJECT_TEAM: "Projektni tim",
  INVESTOR: "Investitor",
  PUBLIC_LINK: "Javna poveznica",
};

/** Categories that are technical and therefore require engineer approval (brief §24). */
const TECHNICAL_CATEGORIES = new Set<ElectroDocCategory>([
  "TECHNICAL_DRAWING",
  "SCHEME",
  "SPECIFICATION",
  "MEASUREMENT",
  "CERTIFICATE",
]);

export function categoryRequiresApproval(category: ElectroDocCategory): boolean {
  return TECHNICAL_CATEGORIES.has(category);
}

/**
 * The next version label. Approved→new upload bumps the major (2.0), otherwise
 * the minor (1.1). Simple and monotonic; good enough for the MVP (brief §25).
 */
export function nextVersionLabel(previous: string | null, previousApproved: boolean): string {
  if (!previous) return "1.0";
  const [major, minor] = previous.split(".").map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(major)) return "1.0";
  if (previousApproved) return `${major + 1}.0`;
  return `${major}.${(Number.isFinite(minor) ? minor : 0) + 1}`;
}

/** Allowed upload MIME types (brief §26, §64). */
export const ELECTRO_ALLOWED_DOC_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/acad",
  "image/vnd.dwg",
  "application/dxf",
]);

export const ELECTRO_ALLOWED_PHOTO_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

/** Per-file upload ceiling in bytes (brief §65 — configurable ceiling; MVP default). */
export const ELECTRO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function validateUpload(
  mimeType: string,
  sizeBytes: number,
  allowed: Set<string>
): string | null {
  if (!allowed.has(mimeType)) return "Vrsta datoteke nije podržana.";
  if (sizeBytes <= 0) return "Datoteka je prazna.";
  if (sizeBytes > ELECTRO_MAX_UPLOAD_BYTES) return "Datoteka premašuje dopuštenu veličinu (50 MB).";
  return null;
}
