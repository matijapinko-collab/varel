"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { electroLogin, type ElectroActionResult } from "@/server/actions/electro-auth";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

export function ElectroLoginForm() {
  const [state, action, pending] = useActionState<ElectroActionResult, FormData>(
    (_prev, form) => electroLogin(_prev, form),
    {}
  );
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className={electroLabelCls}>E-mail adresa</label>
        <input id="email" name="email" type="email" required autoComplete="username" autoCapitalize="none" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="password" className={electroLabelCls}>Lozinka</label>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className={`${electroInputCls} pr-10`} />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-foreground" aria-label={show ? "Sakrij lozinku" : "Prikaži lozinku"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Prijava…" : "Prijavi se"}
      </button>
    </form>
  );
}
