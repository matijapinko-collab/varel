"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword, type ResetResult } from "@/server/actions/hvac-b2b-auth";
import { authInputCls } from "./auth-shell";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetResult, FormData>(
    (_prev, form) => requestPasswordReset(_prev, form),
    {},
  );

  if (state.ok) {
    return <p className="rounded-lg border border-sky-500/40 bg-sky-500/5 px-3 py-3 text-sm">Ako račun postoji, poslali smo poveznicu za ponovno postavljanje lozinke na vašu e-mail adresu.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Poslovni e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={authInputCls} />
      </div>
      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Šaljem…" : "Pošalji poveznicu"}
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetResult, FormData>(
    (_prev, form) => resetPassword(_prev, form),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Nova lozinka</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className={authInputCls} />
        <p className="mt-1 text-xs text-muted">Najmanje 10 znakova.</p>
      </div>
      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Spremam…" : "Postavi novu lozinku"}
      </button>
    </form>
  );
}
