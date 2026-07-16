import { db } from "@/lib/db";
import { requireTenantContext, MANAGE_ROLES } from "@/lib/hvac/tenant";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";
import { createTechnician, toggleTechnician } from "@/server/actions/hvac-b2b";

export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  const ctx = await requireTenantContext();
  const canManage = MANAGE_ROLES.includes(ctx.role);
  const technicians = await db.hvacTechnician.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Majstori" />

      {canManage && (
        <form action={createTechnician} className="mb-6">
          <FormSection title="Dodaj majstora">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ime i prezime"><Input name="name" required /></Field>
              <Field label="Telefon"><Input name="phone" /></Field>
              <Field label="E-mail"><Input name="email" type="email" /></Field>
              <Field label="Specijalizacija"><Input name="specialization" placeholder="montaža, servis…" /></Field>
              <Field label="Područje rada"><Input name="serviceArea" /></Field>
              <Field label="Boja u kalendaru"><Input name="calendarColor" type="color" defaultValue="#0ea5e9" className="h-10 w-16 p-1" /></Field>
            </div>
            <SubmitButton label="Dodaj majstora" />
          </FormSection>
        </form>
      )}

      {technicians.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Još nemate majstora. Dodajte prvog majstora kako biste mu mogli dodjeljivati termine i radne naloge.
        </div>
      ) : (
        <div className="space-y-2">
          {technicians.map((tech) => (
            <div key={tech.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-full border border-border" style={{ background: tech.calendarColor }} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{tech.name}</div>
                  <div className="truncate text-xs text-muted">
                    {[tech.specialization, tech.phone, tech.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tech.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-slate-400/10 text-slate-500"}`}>
                  {tech.isActive ? "Aktivan" : "Neaktivan"}
                </span>
                {canManage && (
                  <form action={toggleTechnician.bind(null, tech.id)}>
                    <button className="text-xs text-muted hover:text-foreground">{tech.isActive ? "Deaktiviraj" : "Aktiviraj"}</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
