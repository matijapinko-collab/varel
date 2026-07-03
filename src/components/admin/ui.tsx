import Link from "next/link";

/* Shared admin UI primitives — server-component friendly. */

export function PageHeader({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <Link
            href={action.href}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} h-11 ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputCls} h-11 cursor-pointer ${props.className ?? ""}`} />
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function SubmitButton({ label = "Save" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      {label}
    </button>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-500/10 text-green-600 dark:text-green-400",
  DRAFT: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  REVIEW: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
  SCHEDULED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  ACTIVE: "bg-green-500/10 text-green-600 dark:text-green-400",
  INACTIVE: "bg-gray-500/10 text-gray-500",
  PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  EXPIRED: "bg-red-500/10 text-red-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-soft text-primary"}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function AdminTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-card border border-border bg-card px-6 py-10 text-center text-sm text-muted">
        Nothing here yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background-secondary text-left">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
