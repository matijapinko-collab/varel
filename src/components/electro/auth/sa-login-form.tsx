"use client";

import { useActionState } from "react";
import { electroSuperadminLogin, type ElectroActionResult } from "@/server/actions/electro-auth";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

export function ElectroSaLoginForm() {
  const [state, action, pending] = useActionState<ElectroActionResult, FormData>(
    (_prev, form) => electroSuperadminLogin(_prev, form),
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="identifier" className={electroLabelCls}>Korisničko ime ili e-mail</label>
        <input id="identifier" name="identifier" type="text" required autoComplete="username" autoCapitalize="none" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="password" className={electroLabelCls}>Lozinka</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Prijava…" : "Prijavi se"}
      </button>
    </form>
  );
}
