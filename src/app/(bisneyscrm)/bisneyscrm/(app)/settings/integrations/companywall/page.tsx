import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { getCompanyWallConnection } from "@/lib/bisneyscrm/companywall/connection";
import { saveCompanyWallConnectionAction, testCompanyWallConnection, disconnectCompanyWallAction } from "@/server/actions/bisneys-companywall";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { PendingButton } from "@/components/bisneyscrm/trello/pending-button";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500";
const btn = "rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50 disabled:opacity-60";
const btnPrimary = "rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";

export default async function CompanyWallSettings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysSuperadmin();
  const conn = await getCompanyWallConnection();
  const sp = await searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : "";

  return (
    <div className="max-w-2xl">
      <BisneysPageHeader title="CompanyWall integracija" description="Službeni podaci o tvrtkama (OIB, financije, bonitet) preko CompanyWall REST API-ja." />

      {msg && (
        <div className={`mb-4 rounded-xl border px-4 py-2 text-sm ${msg === "saved" || msg === "ok" ? "border-green-500/40 text-green-600" : "border-amber-500/40 text-amber-600"}`}>
          {msg === "saved" ? "Podaci spremljeni." : msg === "disconnected" ? "Veza uklonjena." : msg === "ok" ? "Veza radi." : msg === "missing" ? "API URL i ključ su obavezni." : decodeURIComponent(msg)}
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold">Status</h2>
        <p className={`text-sm font-medium ${conn.connected ? "text-green-600" : "text-muted"}`}>{conn.connected ? "Konfigurirano" : "Nije konfigurirano"}</p>
        {conn.connected && (
          <div className="mt-1 text-xs text-muted">
            <div>API URL: {conn.apiUrl}</div>
            <div>Ključ: {conn.keyMask}</div>
            <div>Država: {conn.country ?? "—"}</div>
          </div>
        )}
        {conn.connected && (
          <div className="mt-3 flex gap-2">
            <form action={testCompanyWallConnection}><PendingButton className={btn} pendingLabel="Testiranje…">Testiraj vezu</PendingButton></form>
            <form action={disconnectCompanyWallAction}><PendingButton className={btn} pendingLabel="…">Ukloni vezu</PendingButton></form>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 text-base font-semibold">{conn.connected ? "Ažuriraj podatke" : "Poveži CompanyWall"}</h2>
        <form action={saveCompanyWallConnectionAction} className="space-y-3">
          <div><label className="mb-1 block text-xs text-muted">CompanyWall API URL</label><input name="apiUrl" required defaultValue={conn.apiUrl ?? ""} placeholder="https://api.companywall.hr/…" className={inputCls} /></div>
          <div><label className="mb-1 block text-xs text-muted">API ključ</label><input name="apiKey" required type="password" placeholder="•••• (šifrira se, ne prikazuje se ponovno)" className={inputCls} /></div>
          <div><label className="mb-1 block text-xs text-muted">API secret / token (opcionalno)</label><input name="apiSecret" type="password" placeholder="••••" className={inputCls} /></div>
          <div><label className="mb-1 block text-xs text-muted">Država</label><input name="country" defaultValue={conn.country ?? "HR"} className={inputCls} /></div>
          <PendingButton className={btnPrimary} pendingLabel="Spremanje…">Spremi</PendingButton>
        </form>
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Napomena: stvarni CompanyWall REST endpointi i autorizacija implementiraju se prema dokumentaciji koju CompanyWall dostavlja uz API ugovor.
          Do tada je dostupno ručno povezivanje tvrtke (OIB + pravni podaci) na profilu tvrtke.
        </p>
      </section>
    </div>
  );
}
