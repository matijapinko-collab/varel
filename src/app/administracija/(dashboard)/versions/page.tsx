import { db } from "@/lib/db";
import {
  PageHeader,
  AdminTable,
  Field,
  Input,
  Textarea,
  SubmitButton,
  FormSection,
  StatusBadge,
} from "@/components/admin/ui";
import { createVersion, setVersionStatus, recordBackup } from "@/server/actions/system";

export default async function AdminVersionsPage() {
  const [versions, backups] = await Promise.all([
    db.appVersion.findMany({
      include: { packages: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.backup.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const current = versions.find((v) => v.status === "APPLIED");

  return (
    <div>
      <PageHeader title="Version Manager" />

      <div className="mb-6 rounded-card border border-primary/30 bg-soft p-5 text-sm leading-relaxed">
        <p>
          <strong>Current version: {current?.version ?? process.env.APP_VERSION ?? "0.1.0"}</strong>
        </p>
        <p className="mt-2 text-muted">
          Future updates generated with Claude are recorded here first (changelog + pasted
          code/migration/config), reviewed, then applied <em>manually</em> through Git and
          Vercel — pasted code is <strong>never executed automatically</strong> (security
          requirement). Workflow: ① create a backup, ② record the update below, ③ apply the
          changes via Claude Code / Git following <code>docs/UPDATES.md</code>, ④ mark it
          Applied. Roll back with <code>vercel rollback</code> or Git revert, then mark it
          Rolled back.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <form action={recordBackup}>
          <button
            type="submit"
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            🗄 Record backup
          </button>
        </form>
        <span className="text-xs text-muted">
          Run the database export first — see docs/BACKUP.md
        </span>
      </div>

      <h2 className="text-lg font-semibold">Versions</h2>
      <div className="mt-3">
        <AdminTable headers={["Version", "Title", "Status", "Created", "Actions"]} empty={versions.length === 0}>
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-3 font-mono text-sm font-semibold">{v.version}</td>
              <td className="px-4 py-3 text-sm">
                {v.title}
                {v.changelog && <div className="mt-0.5 line-clamp-2 text-xs text-muted">{v.changelog}</div>}
              </td>
              <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">{v.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {v.status === "DRAFT" && (
                    <form action={setVersionStatus.bind(null, v.id, "READY")}>
                      <SmallBtn label="Mark ready" />
                    </form>
                  )}
                  {(v.status === "READY" || v.status === "DRAFT") && (
                    <form action={setVersionStatus.bind(null, v.id, "APPLIED")}>
                      <SmallBtn label="Mark applied" />
                    </form>
                  )}
                  {v.status === "APPLIED" && (
                    <form action={setVersionStatus.bind(null, v.id, "ROLLED_BACK")}>
                      <SmallBtn label="Mark rolled back" danger />
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Backups</h2>
      <div className="mt-3">
        <AdminTable headers={["Type", "Status", "Notes", "When"]} empty={backups.length === 0}>
          {backups.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-2.5 text-xs">{b.type.toLowerCase()}</td>
              <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
              <td className="px-4 py-2.5 text-xs text-muted">{b.notes ?? "—"}</td>
              <td className="px-4 py-2.5 text-xs text-muted">{b.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <form action={createVersion} className="mt-8 max-w-2xl">
        <FormSection title="Record a new update">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Version number" hint="e.g. 0.2.0">
              <Input name="version" required />
            </Field>
            <Field label="Update title">
              <Input name="title" required />
            </Field>
          </div>
          <Field label="Changelog">
            <Textarea name="changelog" rows={3} />
          </Field>
          <Field label="Code update (paste area — never executed automatically)">
            <Textarea name="codePatch" rows={4} className="font-mono text-xs" />
          </Field>
          <Field label="Database migration (paste area)">
            <Textarea name="migrationPatch" rows={3} className="font-mono text-xs" />
          </Field>
          <Field label="Config update (paste area)">
            <Textarea name="configPatch" rows={2} className="font-mono text-xs" />
          </Field>
          <Field label="Pre-update checklist / notes">
            <Textarea
              name="notes"
              rows={3}
              defaultValue={"1. Backup created\n2. Changes reviewed\n3. Tested locally\n4. Ready to deploy"}
            />
          </Field>
          <SubmitButton label="Save update record" />
        </FormSection>
      </form>
    </div>
  );
}

function SmallBtn({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <button
      type="submit"
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        danger
          ? "border-border text-red-500 hover:border-red-500"
          : "border-border hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
