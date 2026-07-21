"use client";

import { useState } from "react";
import Link from "next/link";
import {
  publishPost,
  trashPost,
  restorePost,
  duplicatePost,
  quickEditPost,
  bulkPostAction,
} from "@/server/actions/posts";

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  languageId: string;
  author: string;
  languages: string[];
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  trashed: boolean;
  seoOk: boolean;
  seoScore: number | null;
  aiScore: number | null;
  category: string | null;
  previewLocale: string;
  /** Canonical public URL, resolved server-side from the post's category. */
  publicUrl: string;
};

type Lang = { id: string; code: string; nativeName: string };

/** Deterministic YYYY-MM-DD so SSR and client hydration always match. */
function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function PostsTable({ rows, languages }: { rows: PostRow[]; languages: Lang[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      {/* Bulk actions */}
      <form action={bulkPostAction} className="mb-2 flex items-center gap-2">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <select
          name="bulkAction"
          defaultValue=""
          className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="" disabled>
            Bulk actions
          </option>
          <option value="publish">Change status to Published</option>
          <option value="draft">Change status to Draft</option>
          <option value="trash">Move to Trash</option>
        </select>
        <button
          type="submit"
          disabled={selected.size === 0}
          className="h-8 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:border-primary disabled:opacity-50"
        >
          Apply
        </button>
        {selected.size > 0 && <span className="text-xs text-muted">{selected.size} selected</span>}
      </form>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-background-secondary text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-8 px-3 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Author</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">SEO</th>
              <th className="px-3 py-2">AI Search</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  No posts found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="group align-top">
                {editing === row.id ? (
                  <td colSpan={8} className="px-3 py-3">
                    <QuickEdit row={row} languages={languages} onDone={() => setEditing(null)} />
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/administracija/posts/${row.id}/edit`} className="font-medium hover:text-primary">
                        {row.title}
                      </Link>
                      <RowActions row={row} onQuickEdit={() => setEditing(row.id)} />
                    </td>
                    <td className="px-3 py-2.5 text-muted">{row.author}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {row.category ? <span className="rounded bg-soft px-1.5 py-0.5 text-primary">{row.category}</span> : <span className="text-amber-600">— none —</span>}
                    </td>
                    <td className="px-3 py-2.5"><ScoreCell score={row.seoScore} editUrl={`/administracija/posts/${row.id}/edit`} /></td>
                    <td className="px-3 py-2.5"><ScoreCell score={row.aiScore} editUrl={`/administracija/posts/${row.id}/edit`} /></td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={row.trashed ? "TRASH" : row.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{fmtDate(row.updatedAt)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({ row, onQuickEdit }: { row: PostRow; onQuickEdit: () => void }) {
  const publicUrl = row.publicUrl;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
      {row.trashed ? (
        <>
          <ActionButton action={restorePost.bind(null, row.id)} label="Restore" />
          <span>·</span>
          <Link href={`/administracija/posts/${row.id}/edit`} className="hover:text-primary">Edit</Link>
        </>
      ) : (
        <>
          <Link href={`/administracija/posts/${row.id}/edit`} className="hover:text-primary">Edit</Link>
          <span>·</span>
          <button onClick={onQuickEdit} className="hover:text-primary">Quick Edit</button>
          <span>·</span>
          {row.status === "PUBLISHED" ? (
            <Link href={publicUrl} target="_blank" className="hover:text-primary">View</Link>
          ) : (
            <>
              <Link href={publicUrl} target="_blank" className="hover:text-primary">Preview</Link>
              <span>·</span>
              <ActionButton action={publishPost.bind(null, row.id)} label="Publish" />
            </>
          )}
          <span>·</span>
          <ActionButton action={duplicatePost.bind(null, row.id)} label="Duplicate" />
          <span>·</span>
          <ActionButton action={trashPost.bind(null, row.id)} label="Trash" danger />
        </>
      )}
    </div>
  );
}

function ActionButton({ action, label, danger }: { action: () => Promise<void>; label: string; danger?: boolean }) {
  return (
    <form action={action} className="inline">
      <button type="submit" className={danger ? "text-red-500 hover:underline" : "hover:text-primary"}>
        {label}
      </button>
    </form>
  );
}

function QuickEdit({ row, languages, onDone }: { row: PostRow; languages: Lang[]; onDone: () => void }) {
  return (
    <form action={quickEditPost.bind(null, row.id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3">
      <input type="hidden" name="languageId" value={row.languageId} />
      <label className="flex flex-col gap-1 text-xs">
        Title
        <input name="title" defaultValue={row.title} className="h-8 w-64 rounded border border-border bg-card px-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Slug
        <input name="slug" defaultValue={row.slug} className="h-8 w-48 rounded border border-border bg-card px-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Status
        <select name="status" defaultValue={row.status} className="h-8 rounded border border-border bg-card px-2 text-sm">
          {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="h-8 rounded bg-primary px-3 text-sm font-semibold text-primary-foreground">Update</button>
        <button type="button" onClick={onDone} className="h-8 rounded border border-border px-3 text-sm">Cancel</button>
      </div>
      {/* languages prop reserved for future multi-language quick edit */}
      <span className="hidden">{languages.length}</span>
    </form>
  );
}

function ScoreCell({ score, editUrl }: { score: number | null; editUrl: string }) {
  if (score == null) {
    return <Link href={editUrl} className="text-xs text-muted hover:text-primary">Needs review</Link>;
  }
  const cls = score >= 70 ? "bg-green-500/10 text-green-600" : score >= 40 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600";
  const label = score >= 100 ? "Complete" : `${score}%`;
  return (
    <Link href={editUrl} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PUBLISHED: "bg-green-500/10 text-green-600",
    DRAFT: "bg-amber-500/10 text-amber-600",
    REVIEW: "bg-blue-500/10 text-blue-600",
    ARCHIVED: "bg-gray-400/10 text-gray-500",
    TRASH: "bg-red-500/10 text-red-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-gray-200 text-gray-600"}`}>
      {status.toLowerCase()}
    </span>
  );
}
