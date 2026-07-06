import { db } from "@/lib/db";
import {
  PageHeader,
  AdminTable,
  Field,
  Input,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
} from "@/components/admin/ui";
import { createUser, updateUser } from "@/server/actions/system";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";
import { auth } from "@/lib/auth";

const ROLE_TYPES = [
  "OWNER", "ADMIN", "EDITOR", "WRITER", "TRANSLATOR",
  "AFFILIATE_MANAGER", "SEO_MANAGER", "VIEWER",
];

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    auth(),
  ]);
  const me = users.find((u) => u.id === session?.user?.id);

  return (
    <div>
      <PageHeader title="Users & roles" />

      <div className="space-y-3">
        {users.map((user) => (
          <details key={user.id} className="rounded-card border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5">
              <span>
                <span className="font-semibold">{user.name}</span>{" "}
                <span className="text-sm text-muted">
                  @{user.username} · {user.email}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-soft px-2 py-0.5 font-semibold text-primary">
                  {user.role.name}
                </span>
                {user.twoFactorEnabled && <span title="2FA enabled">🔐</span>}
                {!user.isActive && <span className="text-red-500">inactive</span>}
              </span>
            </summary>
            <form action={updateUser.bind(null, user.id)} className="space-y-4 border-t border-border p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Name">
                  <Input name="name" defaultValue={user.name} />
                </Field>
                <Field label="Role">
                  <Select name="roleType" defaultValue={user.role.type}>
                    {ROLE_TYPES.map((r) => (
                      <option key={r} value={r}>{r.toLowerCase().replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="New password" hint="Leave empty to keep; min 10 chars, upper+lower+digit">
                  <Input name="password" type="password" autoComplete="new-password" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-5">
                <Checkbox name="isActive" label="Active" defaultChecked={user.isActive} />
                {user.twoFactorEnabled && (
                  <Checkbox name="disable2fa" label="Disable 2FA (recovery)" />
                )}
              </div>
              <SubmitButton label="Save user" />
            </form>
          </details>
        ))}
      </div>

      {me && (
        <div className="mt-8 max-w-xl">
          <TwoFactorSetup enabled={me.twoFactorEnabled} />
        </div>
      )}

      <form action={createUser} className="mt-8 max-w-xl">
        <FormSection title="Add user">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Username">
              <Input name="username" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Password" hint="Min 10 chars, upper+lower+digit">
              <Input name="password" type="password" required autoComplete="new-password" />
            </Field>
            <Field label="Role">
              <Select name="roleType" defaultValue="EDITOR">
                {ROLE_TYPES.map((r) => (
                  <option key={r} value={r}>{r.toLowerCase().replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
          </div>
          <SubmitButton label="Create user" />
        </FormSection>
      </form>
    </div>
  );
}
