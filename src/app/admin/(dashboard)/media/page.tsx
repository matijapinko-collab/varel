/* eslint-disable @next/next/no-img-element */
import { db } from "@/lib/db";
import { storageMode } from "@/lib/storage";
import { PageHeader, Field, Input, SubmitButton } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/media-uploader";
import { DeleteButton } from "@/components/admin/delete-button";
import { updateMedia, deleteMedia } from "@/server/actions/media";

export default async function AdminMediaPage() {
  const media = await db.media.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Media Library">
        <MediaUploader />
      </PageHeader>
      {storageMode() === "local" && (
        <div className="mb-4 rounded-card border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          Storage: local dev folder (<code>public/uploads</code>). Configure Cloudflare R2
          environment variables for production — see <code>docs/DEPLOYMENT.md</code>.
        </div>
      )}
      {media.length === 0 ? (
        <div className="rounded-card border border-border bg-card px-6 py-10 text-center text-sm text-muted">
          No media yet — upload your first image.
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
                  {(m.size / 1024).toFixed(0)} KB · ID: <code className="select-all">{m.id}</code>
                </div>
              </summary>
              <div className="border-t border-border p-4">
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
