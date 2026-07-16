"use client";

import { useActionState } from "react";
import { superadminLogin, superadminChangePassword, type SaLoginResult, type SaPasswordResult } from "@/server/actions/hvac-superadmin";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-sky-500";

export function SuperadminLoginForm() {
  const [state, action, pending] = useActionState<SaLoginResult, FormData>(
    (p, f) => superadminLogin(p, f),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">Korisničko ime</label>
        <input id="username" name="username" required autoComplete="username" autoFocus className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Zaporka</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Provjera…" : "Prijava"}
      </button>
    </form>
  );
}

const RULES = [
  "najmanje 12 znakova",
  "veliko i malo slovo",
  "barem jedna znamenka",
  "barem jedan poseban znak",
  "ne smije sadržavati korisničko ime",
  "mora se razlikovati od početne zaporke",
];

export function SuperadminPasswordForm() {
  const [state, action, pending] = useActionState<SaPasswordResult, FormData>(
    (p, f) => superadminChangePassword(p, f),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">Trenutna zaporka</label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={input} />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">Nova zaporka</label>
        <input id="newPassword" name="newPassword" type="password" required minLength={12} autoComplete="new-password" className={input} />
      </div>
      <div>
        <label htmlFor="repeatPassword" className="mb-1 block text-sm font-medium">Ponovite novu zaporku</label>
        <input id="repeatPassword" name="repeatPassword" type="password" required minLength={12} autoComplete="new-password" className={input} />
      </div>

      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <p className="text-xs font-semibold">Zahtjevi za zaporku</p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
          {RULES.map((r) => <li key={r} className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-sky-500" /> {r}</li>)}
        </ul>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Spremam…" : "Postavi novu zaporku"}
      </button>
    </form>
  );
}
