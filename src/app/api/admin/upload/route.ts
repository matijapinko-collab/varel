import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import {
  uploadFile,
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !roleCan(session.user.role, "media.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const ext = ALLOWED_UPLOAD_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 415 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 60);
  const key = `media/${Date.now()}-${safeName}.${ext}`;

  const { url, storageKey } = await uploadFile(key, buffer, file.type);

  const media = await db.media.create({
    data: {
      filename: `${safeName}.${ext}`,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      url,
      storageKey,
      altText: String(formData.get("altText") ?? "") || null,
      uploadedById: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    action: "MEDIA_UPLOAD",
    entityType: "MEDIA",
    entityId: media.id,
    details: { filename: media.filename, size: media.size },
  });

  return NextResponse.json({ media });
}
