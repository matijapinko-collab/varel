import { redirect } from "next/navigation";
import { isBisneysEnabled, BISNEYS_BASE } from "@/lib/bisneyscrm/auth/session";
import { getBisneysUser } from "@/lib/bisneyscrm/auth/guard";

export const dynamic = "force-dynamic";

/** Entry point: coming-soon when disabled, otherwise route by session state. */
export default async function BisneysIndex() {
  if (!isBisneysEnabled()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-black text-white">B</span>
          <h1 className="text-xl font-bold">Bisneys CRM</h1>
          <p className="mt-2 text-sm text-muted">Interni sustav uskoro će biti dostupan.</p>
        </div>
      </main>
    );
  }

  const user = await getBisneysUser();
  if (!user) redirect(`${BISNEYS_BASE}/login`);
  if (user.mustChangePassword) redirect(`${BISNEYS_BASE}/change-password`);
  redirect(`${BISNEYS_BASE}/dashboard`);
}
