"use client";

import { useActionState } from "react";
import { electroAcceptInvite, type ElectroActionResult } from "@/server/actions/electro-auth";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

export function ElectroSetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ElectroActionResult, FormData>(
    (_prev, form) => electroAcceptInvite(_prev, form),
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className={electroLabelCls}>Nova lozinka</label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className={electroInputCls} />
        <p className="mt-1 text-xs text-muted">Najmanje 10 znakova, veliko i malo slovo, znamenka i poseban znak.</p>
      </div>
      <div>
        <label htmlFor="repeatPassword" className={electroLabelCls}>Ponovite lozinku</label>
        <input id="repeatPassword" name="repeatPassword" type="password" required autoComplete="new-password" className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Spremanje…" : "Postavi lozinku i prijavi se"}
      </button>
    </form>
  );
}
