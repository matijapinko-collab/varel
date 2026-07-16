"use client";

import { useActionState } from "react";
import { saveTrelloCredentials, type TrelloConnectResult } from "@/server/actions/bisneys-trello";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500";

export function TrelloCredentialsForm() {
  const [state, action, pending] = useActionState<TrelloConnectResult, FormData>(
    (_prev, form) => saveTrelloCredentials(_prev, form),
    {}
  );

  return (
    <form action={action} className="max-w-md space-y-3">
      <div>
        <label htmlFor="apiKey" className="mb-1 block text-sm font-medium">Trello API ključ</label>
        <input id="apiKey" name="apiKey" type="text" required autoComplete="off" className={inputCls} />
      </div>
      <div>
        <label htmlFor="token" className="mb-1 block text-sm font-medium">Trello token</label>
        <input id="token" name="token" type="password" required autoComplete="off" className={inputCls} />
        <p className="mt-1 text-xs text-muted">
          Ključ i token spremaju se šifrirano na serveru i nikada se ne prikazuju u punom obliku.
        </p>
      </div>
      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10">Povezano. Odaberite boardove ispod.</p>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Provjera…" : "Testiraj i spremi"}
      </button>
    </form>
  );
}
