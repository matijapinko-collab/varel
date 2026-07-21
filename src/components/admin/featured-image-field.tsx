"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

export type MediaItem = { id: string; url: string; name: string };

/**
 * Featured-image picker for the plain (non-React-state) admin forms.
 * Submits the chosen id through a hidden input, so any server action that
 * reads `fd(form, name)` picks it up without further wiring.
 */
export function FeaturedImageField({
  media,
  initialId,
  initialUrl,
  name = "featuredImageId",
  label = "Featured image",
  hint,
}: {
  media: MediaItem[];
  initialId: string | null;
  initialUrl: string | null;
  /** Form field name — e.g. "imageId" for deals. */
  name?: string;
  label?: string;
  hint?: string;
}) {
  const [id, setId] = useState<string | null>(initialId);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? media.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
    : media;

  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={id ?? ""} />

      {url ? (
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-soft">
            <Image src={url} alt="" fill className="object-cover" unoptimized />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => { setId(null); setUrl(null); }}
              className="text-left text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted hover:border-primary hover:text-foreground"
        >
          <ImagePlus size={16} /> Set featured image
        </button>
      )}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-card border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border p-4">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search media…"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No images found. Upload one in Media first.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setId(m.id); setUrl(m.url); setOpen(false); }}
                      className="group overflow-hidden rounded-lg border border-border hover:border-primary"
                      title={m.name}
                    >
                      <div className="relative aspect-video bg-soft">
                        <Image src={m.url} alt="" fill className="object-cover" unoptimized />
                      </div>
                      <div className="truncate px-2 py-1 text-left text-[11px] text-muted">{m.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
