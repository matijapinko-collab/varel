"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

const KINDS = [
  { value: "BEFORE", label: "Prije" },
  { value: "AFTER", label: "Poslije" },
  { value: "DEVICE", label: "Uređaj" },
  { value: "LABEL", label: "Naljepnica" },
  { value: "MATERIAL", label: "Materijal" },
  { value: "OTHER", label: "Ostalo" },
];

/** Uploads work-order photos (camera-capable on mobile). */
export function WoPhotoUpload({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("AFTER");
  const [status, setStatus] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setStatus(`Učitavam ${files.length}…`);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("entityType", "work_order");
      fd.append("entityId", workOrderId);
      const res = await fetch("/api/hvac-b2b/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus(`Greška: ${d.error ?? res.statusText}`);
        return;
      }
    }
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm">
        {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-semibold text-white hover:opacity-90">
        <Camera size={16} /> Dodaj fotografiju
      </button>
      {status && <span className="text-xs text-muted">{status}</span>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={onChange} />
    </div>
  );
}
