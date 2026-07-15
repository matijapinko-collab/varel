"use client";

import { useActionState } from "react";
import { loginHvac, type LoginResult } from "@/server/actions/hvac-b2b-auth";
import { authInputCls } from "./auth-shell";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginResult, FormData>(
    (_prev, form) => loginHvac(_prev, form),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Poslovni e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={authInputCls} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Lozinka</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={authInputCls} />
      </div>
      {state.error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Prijava…" : "Prijava"}
      </button>
    </form>
  );
}
