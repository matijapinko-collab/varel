import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { getSafeConnection } from "@/lib/bisneyscrm/trello/connection";
import { SALES_STATUS_LABELS, SALES_STATUS_VALUES } from "@/lib/bisneyscrm/trello/mapping";
import Link from "next/link";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { TrelloCredentialsForm } from "@/components/bisneyscrm/trello/credentials-form";
import { PendingButton } from "@/components/bisneyscrm/trello/pending-button";
import {
  testTrelloConnection, refreshTrelloBoards, saveBoardSelection, saveListMapping,
  runTrelloInitialSync, runTrelloReconcile, recreateTrelloWebhook, disconnectTrello,
} from "@/server/actions/bisneys-trello";
import { backfillInteractions } from "@/server/actions/bisneys-interactions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  SYNCED: "text-green-600 dark:text-green-400",
  SYNCING: "text-blue-600 dark:text-blue-400",
  PENDING: "text-yellow-600 dark:text-yellow-400",
  PARTIALLY_SYNCED: "text-yellow-600 dark:text-yellow-400",
  ERROR: "text-red-600 dark:text-red-400",
  DISCONNECTED: "text-muted",
};

const btn = "rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50 disabled:opacity-60";
const btnPrimary = "rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
const inputCls = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-indigo-500";

export default async function TrelloSettings() {
  await requireBisneysSuperadmin();
  const conn = await getSafeConnection();

  const boards = conn.connected
    ? await db.bisneysTrelloBoard.findMany({ orderBy: { name: "asc" } })
    : [];
  const selected = boards.filter((b) => b.isSelected);
  const lists = selected.length
    ? await db.bisneysTrelloList.findMany({
        where: { boardId: { in: selected.map((b) => b.externalId) } },
        orderBy: [{ boardId: "asc" }, { position: "asc" }],
      })
    : [];
  const logs = conn.connected
    ? await db.bisneysTrelloSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 6 })
    : [];

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Trello integracija" description="Povezivanje, odabir boardova i mapiranje lista." />

      {/* Status */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Status veze</h2>
            <p className={`mt-1 text-sm font-medium ${STATUS_TONE[conn.status] ?? ""}`}>{conn.status}</p>
            {conn.workspaceName && <p className="text-sm text-muted">Povezano kao: {conn.workspaceName}</p>}
            {conn.connected && <p className="text-xs text-muted">Token: {conn.tokenMask}</p>}
            <p className="mt-1 text-xs text-muted">
              Zadnja sinkronizacija: {conn.lastSyncedAt ? conn.lastSyncedAt.toLocaleString("hr-HR") : "—"}
            </p>
            {conn.lastError && <p className="mt-1 text-xs text-red-500">Greška: {conn.lastError}</p>}
          </div>
          {conn.connected && (
            <div className="flex gap-2">
              <form action={testTrelloConnection}><PendingButton className={btn} pendingLabel="Testiranje…">Testiraj vezu</PendingButton></form>
              <form action={disconnectTrello}><PendingButton className={btn} pendingLabel="…">Odspoji</PendingButton></form>
            </div>
          )}
        </div>
      </section>

      {!conn.connected ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-1 text-base font-semibold">Povezivanje</h2>
          <p className="mb-4 text-sm text-muted">Unesite Trello API ključ i token da biste povezali workspace.</p>
          <TrelloCredentialsForm />
        </section>
      ) : (
        <>
          {/* Board selection */}
          <section className="mb-6 rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Boardovi</h2>
              <form action={refreshTrelloBoards}><PendingButton className={btn} pendingLabel="…">Osvježi popis</PendingButton></form>
            </div>
            <form action={saveBoardSelection} className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border pb-2 text-xs font-semibold text-muted">
                <span>Board</span><span className="px-2">Prati</span><span className="px-2">Sales</span>
              </div>
              {boards.map((b) => (
                <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
                  <span className="truncate">{b.name}</span>
                  <input type="checkbox" name={`board:${b.externalId}`} defaultChecked={b.isSelected} className="mx-auto h-4 w-4 accent-[var(--primary)]" />
                  <input type="radio" name="sales" value={b.externalId} defaultChecked={conn.salesBoardId === b.externalId} className="mx-auto h-4 w-4 accent-[var(--primary)]" />
                </div>
              ))}
              {boards.length === 0 && <p className="text-sm text-muted">Nema boardova. Kliknite „Osvježi popis".</p>}
              <div className="pt-2"><PendingButton className={btnPrimary} pendingLabel="Spremanje…">Spremi odabir</PendingButton></div>
            </form>
          </section>

          {/* List mapping */}
          {selected.length > 0 && (
            <section className="mb-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-1 text-base font-semibold">Mapiranje lista → status</h2>
              <p className="mb-4 text-sm text-muted">Mapiranje je vezano uz ID liste pa preživljava preimenovanja.</p>
              <form action={saveListMapping} className="space-y-4">
                {selected.map((board) => {
                  const boardLists = lists.filter((l) => l.boardId === board.externalId);
                  return (
                    <div key={board.id}>
                      <div className="mb-2 text-sm font-semibold">{board.name}</div>
                      <div className="space-y-1.5">
                        {boardLists.map((l) => (
                          <div key={l.id} className="grid grid-cols-2 items-center gap-2">
                            <span className="truncate text-sm">{l.name}</span>
                            <select name={`list:${l.externalId}`} defaultValue={l.mappedStatus ?? ""} className={inputCls}>
                              <option value="">(bez mapiranja)</option>
                              {SALES_STATUS_VALUES.map((s) => (
                                <option key={s} value={s}>{SALES_STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {boardLists.length === 0 && <p className="text-sm text-muted">Nema lista — pokrenite sinkronizaciju.</p>}
                      </div>
                    </div>
                  );
                })}
                <PendingButton className={btnPrimary} pendingLabel="Spremanje…">Spremi mapiranje</PendingButton>
              </form>
            </section>
          )}

          {/* Sync actions */}
          <section className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold">Sinkronizacija</h2>
            <div className="flex flex-wrap gap-2">
              <form action={runTrelloInitialSync}><PendingButton className={btnPrimary} pendingLabel="Sinkronizacija…">Pokreni inicijalnu sinkronizaciju</PendingButton></form>
              <form action={runTrelloReconcile}><PendingButton className={btn} pendingLabel="…">Reconcile</PendingButton></form>
              <form action={recreateTrelloWebhook}><PendingButton className={btn} pendingLabel="…">Ponovno kreiraj webhook</PendingButton></form>
              <form action={backfillInteractions}><PendingButton className={btn} pendingLabel="Obrada…">Backfill interakcija iz komentara</PendingButton></form>
            </div>
            <p className="mt-3 text-xs text-muted">Webhook URL: <code>{process.env.BISNEYS_TRELLO_CALLBACK_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/bisneyscrm/trello/webhook`}</code></p>
          </section>

          {/* Candidate label mapping (Faza 10) */}
          <section className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-1 text-base font-semibold">Kandidati iz Trella</h2>
            <p className="mb-4 text-sm text-muted">Mapiraj labele delivery-kartica na zanimanje / status / tag; parser vadi email i telefon iz teksta kartice.</p>
            <Link href="/bisneyscrm/settings/trello/labels" className={btnPrimary}>Mapiranje labela → kandidati</Link>
          </section>

          {/* Sync log */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold">Zadnje sinkronizacije</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted">Još nema zapisa sinkronizacije.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 pr-4 font-semibold">Vrsta</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 pr-4 font-semibold">Početak</th>
                      <th className="py-2 pr-4 font-semibold">Poruka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 pr-4">{l.kind}</td>
                        <td className={`py-2 pr-4 font-medium ${STATUS_TONE[l.status] ?? ""}`}>{l.status}</td>
                        <td className="py-2 pr-4 text-muted">{l.startedAt.toLocaleString("hr-HR")}</td>
                        <td className="py-2 pr-4 text-muted">{l.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
