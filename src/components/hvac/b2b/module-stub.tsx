import { PageHeader } from "@/components/admin/ui";

/** Varel-styled placeholder for modules delivered in a later phase. */
export function ModuleStub({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">✦</span>
        <h2 className="mt-4 font-semibold">{title} — u pripremi</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
        <p className="mt-3 text-xs text-muted">Ovaj modul stiže u sljedećoj fazi razvoja Varel HVAC aplikacije.</p>
      </div>
    </div>
  );
}
