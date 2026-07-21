"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw } from "lucide-react";
import { restoreRevision } from "@/server/actions/posts";

export type RevisionItem = {
  id: string;
  title: string;
  status: string;
  kind: string;
  createdByName: string | null;
  createdAt: string; // ISO — serialized by the server component
};

const KIND_LABEL: Record<string, string> = {
  save: "Draft save",
  publish: "Publish",
  restore: "Restore point",
};

/** Deterministic formatting — avoids a server/client hydration mismatch. */
function fmt(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function RevisionsPanel({ revisions }: { revisions: RevisionItem[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function doRestore(id: string) {
    if (!confirm("Restore this revision? The current version is saved as a restore point first.")) return;
    start(async () => {
      const res = await restoreRevision(id);
      setMsg(res.message);
      if (res.ok) window.location.reload();
    });
  }

  return (
    <div className="rounded-card border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <History size={15} className="text-primary" /> Revisions
        </span>
        <span className="text-xs text-muted">{revisions.length}{open ? " ▲" : " ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {revisions.length === 0 ? (
            <p className="text-xs text-muted">
              No revisions yet. One is stored automatically each time you save or publish.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{fmt(r.createdAt)}</div>
                    <div className="truncate text-[11px] text-muted">
                      {KIND_LABEL[r.kind] ?? r.kind} · {r.status}
                      {r.createdByName ? ` · ${r.createdByName}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => doRestore(r.id)}
                    disabled={pending}
                    title="Restore this version"
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] hover:border-primary disabled:opacity-50"
                  >
                    <RotateCcw size={12} className="inline" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
        </div>
      )}
    </div>
  );
}
