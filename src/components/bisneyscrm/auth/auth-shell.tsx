export const authInputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:opacity-50";

/** Centered card used by the login and change-password screens. */
export function BisneysAuthShell({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-black text-white">B</span>
          <h1 className="text-xl font-bold tracking-tight">Bisneys <span className="text-indigo-500">CRM</span></h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 mb-4 text-sm text-muted">{subtitle}</p>}
          <div className={subtitle ? "" : "mt-4"}>{children}</div>
        </div>
      </div>
    </main>
  );
}
