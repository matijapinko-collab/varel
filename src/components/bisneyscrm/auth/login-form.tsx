"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { bisneysLogin, type BisneysLoginResult } from "@/server/actions/bisneys-auth";
import { authInputCls } from "./auth-shell";

export function BisneysLoginForm() {
  const [state, action, pending] = useActionState<BisneysLoginResult, FormData>(
    (_prev, form) => bisneysLogin(_prev, form),
    {}
  );
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="mb-1 block text-sm font-medium">Korisničko ime ili email</label>
        <input id="identifier" name="identifier" type="text" required autoComplete="username" autoCapitalize="none" className={authInputCls} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Zaporka</label>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className={`${authInputCls} pr-10`} />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-foreground" aria-label={show ? "Sakrij zaporku" : "Prikaži zaporku"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/40">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Prijava…" : "Prijavi se"}
      </button>
    </form>
  );
}
