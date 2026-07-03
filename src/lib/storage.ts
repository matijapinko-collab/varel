import "server-only";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

/**
 * Media storage provider system.
 *
 * Selected via STORAGE_PROVIDER:
 *   - "vercel_blob" (DEFAULT for V1) → Vercel Blob (needs BLOB_READ_WRITE_TOKEN)
 *   - "r2"                           → Cloudflare R2 / S3-compatible (needs R2_* vars)
 *   - "disabled"                     → uploads off; external image URLs still work
 *
 * The app never crashes if a provider's variables are missing — it degrades to
 * a clear "not configured" status surfaced in the admin Media Library, and
 * external image URLs can always be used.
 */

export type StorageProvider = "disabled" | "vercel_blob" | "r2";

export class StorageError extends Error {}

export function storageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER ?? "vercel_blob").toLowerCase().trim();
  if (raw === "disabled" || raw === "r2" || raw === "vercel_blob") return raw;
  // Local dev without a provider set: fall back to the on-disk folder.
  return process.env.NODE_ENV === "production" ? "vercel_blob" : "local_fallback" as StorageProvider;
}

/** Whether the configured provider is ready to accept uploads, with a reason if not. */
export function storageStatus(): {
  provider: StorageProvider | "local_fallback";
  ready: boolean;
  reason?: string;
} {
  const provider = storageProvider();

  if (provider === "disabled") {
    return {
      provider,
      ready: false,
      reason:
        "Uploads are turned off (STORAGE_PROVIDER=disabled). You can still add media by pasting an external image URL.",
    };
  }
  if (provider === "vercel_blob") {
    const ready = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    return {
      provider,
      ready,
      reason: ready
        ? undefined
        : "Vercel Blob is selected but BLOB_READ_WRITE_TOKEN is not set. Create a Blob store in the Vercel dashboard (Storage → Blob) and add the token — see docs/DEPLOYMENT.md.",
    };
  }
  if (provider === "r2") {
    const ready = Boolean(
      process.env.R2_ACCESS_KEY &&
        process.env.R2_SECRET_KEY &&
        process.env.R2_BUCKET_NAME &&
        process.env.R2_ENDPOINT &&
        process.env.R2_PUBLIC_URL
    );
    return {
      provider,
      ready,
      reason: ready ? undefined : "Cloudflare R2 is selected but the R2_* variables are incomplete.",
    };
  }
  // local_fallback (dev only)
  return { provider, ready: true };
}

/** Strict allow-list of upload types (V1). AVIF included as an optional extra. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB per file (V1)

/** Uploads a file with the configured provider. Returns a public URL + a storage key. */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; storageKey: string }> {
  const provider = storageProvider();

  if (provider === "disabled") {
    throw new StorageError("Uploads are disabled.");
  }

  if (provider === "vercel_blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new StorageError("BLOB_READ_WRITE_TOKEN is not configured.");
    }
    const { put } = await import("@vercel/blob");
    const result = await put(key, buffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    // For Blob the public URL is also the delete handle, so we store it as the key.
    return { url: result.url, storageKey: result.url };
  }

  if (provider === "r2") {
    const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });
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

  // local_fallback (dev only): write under public/uploads
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: `/uploads/${key}`, storageKey: key };
}

/** Best-effort delete of a stored file. Never throws. */
export async function deleteFile(storageKey: string): Promise<void> {
  try {
    // Vercel Blob (and any absolute public URL we manage) — delete by URL.
    if (storageKey.startsWith("http")) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { del } = await import("@vercel/blob");
        await del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
      return;
    }
    if (storageProvider() === "r2") {
      const { DeleteObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY!,
          secretAccessKey: process.env.R2_SECRET_KEY!,
        },
      });
      await client.send(
        new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: storageKey })
      );
      return;
    }
    // local_fallback
    await unlink(path.join(process.cwd(), "public", "uploads", storageKey));
  } catch (e) {
    console.error("storage delete failed", e);
  }
}
