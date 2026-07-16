import Link from "next/link";
import { toneFor } from "@/lib/bisneyscrm/format";

/* Shared, server-component-friendly CRM primitives (Croatian, indigo accent). */

export const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50";

export function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-24 ${props.className ?? ""}`} />;
}
export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} cursor-pointer ${props.className ?? ""}`} />;
}

export function SubmitButton({ children = "Spremi", variant = "primary" }: { children?: React.ReactNode; variant?: "primary" | "ghost" }) {
  const cls = variant === "primary"
    ? "rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
    : "rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:border-indigo-500/50";
  return <button type="submit" className={cls}>{children}</button>;
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const cls = variant === "primary"
    ? "inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    : "inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50";
  return <Link href={href} className={cls}>{children}</Link>;
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${toneFor(status)}`}>
      {label ?? status}
    </span>
  );
}

export function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: React.ReactNode }) {
  if (empty) {
    return <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background-secondary text-left">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

/** GET form that preserves nothing else — inputs carry the filter state. */
export function FilterBar({ children, exportHref }: { children: React.ReactNode; exportHref?: string }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
      {children}
      <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Filtriraj</button>
      {exportHref && (
        <a href={exportHref} className="ml-auto inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50">
          Izvezi CSV
        </a>
      )}
    </form>
  );
}

export function Pagination({ page, pageCount, params }: { page: number; pageCount: number; params: Record<string, string> }) {
  if (pageCount <= 1) return null;
  const build = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    return `?${q.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Stranica {page} / {pageCount}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={build(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:border-indigo-500/50">Prethodna</Link>}
        {page < pageCount && <Link href={build(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:border-indigo-500/50">Sljedeća</Link>}
      </div>
    </div>
  );
}

export function DetailCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children ?? "—"}</dd>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">← {children}</Link>;
}
