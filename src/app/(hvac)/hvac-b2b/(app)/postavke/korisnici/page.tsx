import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantRole } from "@/lib/hvac/tenant";
import { ROLE_LABELS } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, SubmitButton, FormSection, AdminTable } from "@/components/admin/ui";
import { inviteUser, changeUserRole, toggleUserActive } from "@/server/actions/hvac-b2b";
import type { HvacRole } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const ROLES: HvacRole[] = ["ADMINISTRATOR", "DISPATCHER", "TECHNICIAN", "ACCOUNTANT"];

export default async function UsersSettingsPage() {
  const ctx = await requireTenantRole(["OWNER"]);
  const members = await db.hvacTenantUser.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: { select: { name: true, email: true, emailVerifiedAt: true, lastLoginAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Korisnici" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <form action={inviteUser} className="mt-4">
        <FormSection title="Pozovi korisnika">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ime i prezime"><Input name="name" required /></Field>
            <Field label="E-mail"><Input name="email" type="email" required /></Field>
            <Field label="Uloga">
              <Select name="role" defaultValue="TECHNICIAN">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </Field>
          </div>
          <SubmitButton label="Pošalji pozivnicu" />
        </FormSection>
      </form>

      <div className="mt-6">
        <AdminTable headers={["Ime", "E-mail", "Uloga", "Status", ""]} empty={members.length === 0}>
          {members.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2.5 font-medium">{m.user.name}</td>
              <td className="px-3 py-2.5 text-sm text-muted">
                {m.user.email}
                {!m.user.emailVerifiedAt && <span className="ml-1 text-xs text-amber-600 dark:text-amber-300">(nepotvrđen)</span>}
              </td>
              <td className="px-3 py-2.5">
                {m.role === "OWNER" ? (
                  <span className="text-sm font-semibold">{ROLE_LABELS.OWNER}</span>
                ) : (
                  <form action={changeUserRole.bind(null, m.id)}>
                    <select name="role" defaultValue={m.role} className="rounded border border-border bg-background px-1.5 py-1 text-xs">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button className="ml-1 text-xs text-sky-600 hover:underline dark:text-sky-300">Spremi</button>
                  </form>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-400/10 text-gray-500"}`}>
                  {m.isActive ? "Aktivan" : "Neaktivan"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                {m.role !== "OWNER" && (
                  <form action={toggleUserActive.bind(null, m.id)}>
                    <button className="text-xs text-muted hover:text-foreground">{m.isActive ? "Deaktiviraj" : "Aktiviraj"}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
