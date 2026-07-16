import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getHvacSession } from "@/lib/hvac/b2b-auth";
import { uploadFile, storageStatus } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per photo

/**
 * Tenant-scoped upload for work-order photos / signatures. Validates the
 * session, tenant membership, MIME type and size, stores the file and records
 * an HvacFileAsset bound to the tenant + entity.
 *
 * NOTE (see docs/HVAC_GAP_ANALYSIS.md F4): storage is currently the shared
 * provider (Vercel Blob, unguessable public URLs). Migrating to private
 * object storage with signed, short-lived URLs is a tracked P0 before wide use.
 */
export async function POST(request: Request) {
  const session = await getHvacSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.hvacTenantUser.findFirst({ where: { userId: session.uid, tenantId: session.tid, isActive: true } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = storageStatus();
  if (!status.ready) return NextResponse.json({ error: status.reason ?? "Pohrana nije konfigurirana." }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "OTHER");
  const entityType = String(form.get("entityType") ?? "");
  const entityId = String(form.get("entityId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nedostaje datoteka." }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Podržane su samo JPG, PNG i WebP slike." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Slika je prevelika (maks. 8 MB)." }, { status: 413 });

  // Verify the referenced entity belongs to this tenant before attaching.
  if (entityType === "work_order" && entityId) {
    const wo = await db.hvacWorkOrder.findFirst({ where: { id: entityId, tenantId: session.tid } });
    if (!wo) return NextResponse.json({ error: "Radni nalog nije pronađen." }, { status: 404 });
    if (["COMPLETED", "SENT"].includes(wo.status)) {
      return NextResponse.json({ error: "Nalog je zaključan i ne može se mijenjati." }, { status: 409 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `hvac/${session.tid}/${entityType || "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { url, storageKey } = await uploadFile(key, buffer, file.type);

  const asset = await db.hvacFileAsset.create({
    data: {
      tenantId: session.tid, kind, storageKey, url, mimeType: file.type, size: file.size,
      originalName: file.name.slice(0, 200), uploadedById: session.uid,
      entityType: entityType || null, entityId: entityId || null,
    },
  });

  // Attach as a work-order photo when applicable.
  if (entityType === "work_order" && entityId) {
    await db.hvacWorkOrderPhoto.create({ data: { tenantId: session.tid, workOrderId: entityId, fileAssetId: asset.id, kind } });
  }

  return NextResponse.json({ ok: true, asset: { id: asset.id, url: asset.url } });
}
