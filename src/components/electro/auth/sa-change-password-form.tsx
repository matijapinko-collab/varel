"use client";

import { useActionState } from "react";
import { electroSuperadminChangePassword, type ElectroActionResult } from "@/server/actions/electro-auth";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

export function ElectroSaChangePasswordForm() {
  const [state, action, pending] = useActionState<ElectroActionResult, FormData>(
    (_prev, form) => electroSuperadminChangePassword(_prev, form),
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className={electroLabelCls}>Trenutna lozinka</label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="newPassword" className={electroLabelCls}>Nova lozinka</label>
        <input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" className={electroInputCls} />
        <p className="mt-1 text-xs text-muted">Najmanje 10 znakova, veliko i malo slovo, znamenka i poseban znak.</p>
      </div>
      <div>
        <label htmlFor="repeatPassword" className={electroLabelCls}>Ponovite novu lozinku</label>
        <input id="repeatPassword" name="repeatPassword" type="password" required autoComplete="new-password" className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Spremanje…" : "Promijeni lozinku"}
      </button>
    </form>
  );
}
