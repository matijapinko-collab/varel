/* eslint-disable @next/next/no-img-element */
import { db } from "@/lib/db";
import { storageStatus } from "@/lib/storage";
import { PageHeader, Field, Input, SubmitButton } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/media-uploader";
import { DeleteButton } from "@/components/admin/delete-button";
import { CopyText } from "@/components/admin/copy-text";
import { updateMedia, deleteMedia, addMediaByUrl } from "@/server/actions/media";

const PROVIDER_LABEL: Record<string, string> = {
  vercel_blob: "Vercel Blob",
  r2: "Cloudflare R2",
  disabled: "Disabled",
  local_fallback: "Local dev folder (public/uploads)",
};

export default async function AdminMediaPage() {
  const status = storageStatus();
  const media = await db.media.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const uploadsReady = status.ready && status.provider !== "disabled";

  return (
    <div>
      <PageHeader title="Media Library">
        {uploadsReady && <MediaUploader />}
      </PageHeader>

      {/* Provider status */}
      {!uploadsReady ? (
        <div className="mb-4 rounded-card border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          <span className="font-semibold">Uploads unavailable.</span>{" "}
          {status.reason}{" "}
          You can still add images by URL below.
        </div>
      ) : status.provider === "local_fallback" ? (
        <div className="mb-4 rounded-card border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          Storage: local dev folder (<code>public/uploads</code>) — works locally only. In
          production Varel uses <strong>Vercel Blob</strong> (set{" "}
          <code>STORAGE_PROVIDER=vercel_blob</code> and <code>BLOB_READ_WRITE_TOKEN</code>).
          See <code>docs/DEPLOYMENT.md</code>.
        </div>
      ) : (
        <div className="mb-4 rounded-card border border-border bg-card px-4 py-2.5 text-xs text-muted">
          Storage provider: <strong className="text-foreground">{PROVIDER_LABEL[status.provider]}</strong> · max 5 MB · JPEG, PNG, WebP, SVG, AVIF
        </div>
      )}

      {/* Add by external URL — always available */}
      <details className="mb-6 rounded-card border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Add image by URL (external)
        </summary>
        <form action={addMediaByUrl} className="flex flex-wrap items-end gap-3 border-t border-border p-4">
          <div className="min-w-64 flex-1">
            <Field label="Image URL">
              <Input name="url" type="url" placeholder="https://…/image.png" required />
            </Field>
          </div>
          <div className="w-48">
            <Field label="Alt text">
              <Input name="altText" />
            </Field>
          </div>
          <SubmitButton label="Add" />
        </form>
      </details>

      {media.length === 0 ? (
        <div className="rounded-card border border-border bg-card px-6 py-10 text-center text-sm text-muted">
          No media yet — {uploadsReady ? "upload your first image" : "add an image by URL"}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <details key={m.id} className="rounded-card border border-border bg-card">
              <summary className="cursor-pointer p-3">
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
                  <img
                    src={m.url}
                    alt={m.altText ?? m.filename}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2 truncate text-sm font-medium">{m.title ?? m.filename}</div>
                <div className="text-xs text-muted">
                  {m.size > 0 ? `${(m.size / 1024).toFixed(0)} KB · ` : "external · "}ID:{" "}
                  <code className="select-all">{m.id}</code>
                </div>
              </summary>
              <div className="space-y-3 border-t border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyText value={m.url} label="Copy URL" />
                  <CopyText value={m.id} label="Copy ID" />
                </div>
                <form action={updateMedia.bind(null, m.id)} className="space-y-3">
                  <Field label="Alt text">
                    <Input name="altText" defaultValue={m.altText ?? ""} />
                  </Field>
                  <Field label="Title">
                    <Input name="title" defaultValue={m.title ?? ""} />
                  </Field>
                  <Field label="Caption">
                    <Input name="caption" defaultValue={m.caption ?? ""} />
                  </Field>
                  <div className="flex items-center justify-between">
                    <SubmitButton label="Save" />
                    <DeleteButton
                      action={deleteMedia.bind(null, m.id)}
                      confirmText="Delete this file? Content using it will lose the image."
                    />
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
