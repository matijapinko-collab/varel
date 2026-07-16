"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { bisneysChangePassword, type BisneysPasswordResult } from "@/server/actions/bisneys-auth";
import { authInputCls } from "./auth-shell";

const RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "Najmanje 10 znakova", test: (p) => p.length >= 10 },
  { label: "Veliko slovo", test: (p) => /[A-Z]/.test(p) },
  { label: "Malo slovo", test: (p) => /[a-z]/.test(p) },
  { label: "Znamenka", test: (p) => /[0-9]/.test(p) },
  { label: "Poseban znak", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function BisneysChangePasswordForm() {
  const [state, action, pending] = useActionState<BisneysPasswordResult, FormData>(
    (_prev, form) => bisneysChangePassword(_prev, form),
    {}
  );
  const [show, setShow] = useState(false);
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const type = show ? "text" : "password";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">Trenutna zaporka</label>
        <input id="currentPassword" name="currentPassword" type={type} required autoComplete="current-password" className={authInputCls} />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">Nova zaporka</label>
        <div className="relative">
          <input id="newPassword" name="newPassword" type={type} required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={`${authInputCls} pr-10`} />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-foreground" aria-label={show ? "Sakrij zaporku" : "Prikaži zaporku"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="repeatPassword" className="mb-1 block text-sm font-medium">Ponovite novu zaporku</label>
        <input id="repeatPassword" name="repeatPassword" type={type} required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={authInputCls} />
      </div>

      <ul className="space-y-1 text-xs">
        {RULES.map((r) => {
          const ok = r.test(next);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 ${ok ? "text-green-600 dark:text-green-400" : "text-muted"}`}>
              {ok ? <Check size={13} /> : <X size={13} />} {r.label}
            </li>
          );
        })}
        <li className={`flex items-center gap-1.5 ${repeat && next === repeat ? "text-green-600 dark:text-green-400" : "text-muted"}`}>
          {repeat && next === repeat ? <Check size={13} /> : <X size={13} />} Zaporke se podudaraju
        </li>
      </ul>

      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/40">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Spremanje…" : "Spremi novu zaporku"}
      </button>
    </form>
  );
}
