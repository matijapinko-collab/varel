"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

/**
 * Author photo picker: uploads via the existing media endpoint and stores only
 * the returned public URL in a hidden field (never raw base64). Supports
 * upload / preview / replace / remove.
 */
export function AuthorPhotoUpload({
  name,
  label,
  initialUrl,
}: {
  name: string;
  label: string;
  initialUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [status, setStatus] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus("Image is larger than 2 MB. Please upload a smaller file.");
      return;
    }
    setStatus("Uploading…");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Upload failed: ${data.error ?? res.statusText}`);
        return;
      }
      setUrl(data.media?.url ?? "");
      setStatus(null);
    } catch {
      setStatus("Upload failed. Please try again.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-soft">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Author photo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">No photo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-primary"
            >
              <Upload size={14} /> {url ? "Replace" : "Upload"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 px-3 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                <X size={14} /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">JPG, PNG or WebP · max 2 MB · square (800×800+) recommended.</p>
          {status && <p className="text-xs text-amber-600">{status}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />
    </div>
  );
}
