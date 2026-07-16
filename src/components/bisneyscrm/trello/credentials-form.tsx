"use client";

import { useActionState, useState } from "react";
import { saveTrelloCredentials, type TrelloConnectResult } from "@/server/actions/bisneys-trello";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500";

/**
 * Guided Trello connection (brief §15). Step 1: paste the API key (with a link
 * to trello.com/power-ups/admin). Step 2: authorize via a generated Trello link
 * to obtain the token. Step 3: paste the token and save. Credentials are stored
 * encrypted server-side and never shown in full again.
 */
export function TrelloCredentialsForm() {
  const [state, action, pending] = useActionState<TrelloConnectResult, FormData>(
    (_prev, form) => saveTrelloCredentials(_prev, form),
    {}
  );
  const [apiKey, setApiKey] = useState("");

  const authorizeUrl = apiKey.trim()
    ? `https://trello.com/1/authorize?expiration=never&name=${encodeURIComponent("Bisneys CRM")}&scope=read,write&response_type=token&key=${encodeURIComponent(apiKey.trim())}`
    : null;

  return (
    <form action={action} className="max-w-lg space-y-4">
      <ol className="space-y-2 rounded-xl border border-border bg-background-secondary p-4 text-sm">
        <li><span className="font-semibold">1.</span> Otvori{" "}
          <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-300">trello.com/power-ups/admin</a>{" "}
          → kreiraj Power-Up (ili otvori postojeći) → kartica <b>API key</b> → generiraj i kopiraj <b>API Key</b>.</li>
        <li><span className="font-semibold">2.</span> Zalijepi API Key ispod, zatim klikni <b>„Autoriziraj i dohvati token"</b> — Trello će te pitati za dopuštenje i prikazati <b>token</b>.</li>
        <li><span className="font-semibold">3.</span> Zalijepi token i klikni <b>„Testiraj i spremi"</b>.</li>
      </ol>

      <div>
        <label htmlFor="apiKey" className="mb-1 block text-sm font-medium">Trello API ključ</label>
        <input id="apiKey" name="apiKey" type="text" required autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={inputCls} placeholder="npr. a1b2c3…" />
      </div>

      <div>
        {authorizeUrl ? (
          <a href={authorizeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-indigo-500/50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300">
            Autoriziraj i dohvati token →
          </a>
        ) : (
          <span className="text-xs text-muted">Unesi API ključ da bi se aktivirao gumb za autorizaciju.</span>
        )}
      </div>

      <div>
        <label htmlFor="token" className="mb-1 block text-sm font-medium">Trello token</label>
        <input id="token" name="token" type="password" required autoComplete="off" className={inputCls} placeholder="zalijepi token iz koraka 2" />
        <p className="mt-1 text-xs text-muted">Ključ i token spremaju se šifrirano na serveru i nikada se ne prikazuju u punom obliku.</p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10">Povezano. Odaberite boardove i mapirajte liste ispod.</p>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Provjera…" : "Testiraj i spremi"}
      </button>
    </form>
  );
}
