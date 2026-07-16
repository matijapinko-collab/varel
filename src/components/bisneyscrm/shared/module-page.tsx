import { Construction } from "lucide-react";

/** Page header used across CRM modules. */
export function BisneysPageHeader({
  title, description, children,
}: {
  title: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Reusable empty state (brief §61). */
export function BisneysEmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Placeholder for modules that are scaffolded now and filled in later phases
 * (brief §71). Keeps navigation, auth and layout fully functional today.
 */
export function BisneysModuleStub({
  title, description, phase, hint,
}: {
  title: string; description?: string; phase?: string; hint?: string;
}) {
  return (
    <div>
      <BisneysPageHeader title={title} description={description} />
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-indigo-500/10 text-indigo-500">
          <Construction size={20} />
        </span>
        <p className="text-sm font-medium">Modul u pripremi</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          {hint ?? "Ovaj se modul gradi u sljedećoj fazi implementacije."}
          {phase && <> ({phase})</>}
        </p>
      </div>
    </div>
  );
}
