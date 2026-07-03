import "server-only";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

/**
 * Object storage adapter.
 * - Production: Cloudflare R2 (or any S3-compatible endpoint) via env vars.
 * - Development fallback: files under public/uploads (NOT usable on Vercel —
 *   configure R2 for production; see docs/DEPLOYMENT.md).
 */

const R2_CONFIGURED = Boolean(
  process.env.R2_ACCESS_KEY &&
    process.env.R2_SECRET_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT
);

async function r2Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
}

export function storageMode(): "r2" | "local" {
  return R2_CONFIGURED ? "r2" : "local";
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; storageKey: string }> {
  if (R2_CONFIGURED) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await r2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    return { url: `${publicBase}/${key}`, storageKey: key };
  }

  // Local development fallback
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: `/uploads/${key}`, storageKey: key };
}

export async function deleteFile(storageKey: string): Promise<void> {
  try {
    if (R2_CONFIGURED) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await r2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: storageKey,
        })
      );
    } else {
      await unlink(path.join(process.cwd(), "public", "uploads", storageKey));
    }
  } catch (e) {
    console.error("storage delete failed", e);
  }
}

/** Strict upload validation: type + size. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
