import Link from "next/link";

/** Centered Varel-styled auth card for the B2B login / register / reset pages. */
export function AuthShell({
  title, subtitle, children, footer, wide,
}: {
  title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background-secondary">
      <div className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-12 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Link href="/hvac" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 font-black text-white">V</span>
          <span className="text-xl font-bold tracking-tight">Varel <span className="text-sky-500">HVAC</span></span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/hvac" className="hover:text-foreground">← Natrag na Varel HVAC</Link>
        </p>
      </div>
    </div>
  );
}

export const authInputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-sky-500";
