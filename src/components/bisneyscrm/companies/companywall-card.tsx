import { linkCompanyWallManual, refreshCompanyWall, unlinkCompanyWall } from "@/server/actions/bisneys-companywall";
import { shortDate } from "@/lib/bisneyscrm/format";

export type CompanyWallProfileView = {
  legalName: string | null; oib: string | null; mbs: string | null; status: string | null;
  legalForm: string | null; vatStatus: string | null; foundedAt: string | null;
  address: string | null; city: string | null; postalCode: string | null;
  nkd: string | null; activity: string | null; employeeCount: number | null;
  revenue: string | null; creditRating: string | null;
  source: string; fetchedAt: string | null;
};

const inputCls = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-indigo-500";
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-muted">{label}</span><span className="text-right font-medium">{value ?? "—"}</span></div>;
}

export function CompanyWallCard({ companyId, profile, message }: { companyId: string; profile: CompanyWallProfileView | null; message?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Podaci o tvrtki <span className="text-xs font-normal text-muted">CompanyWall</span></h2>
        {profile && (
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs ${profile.source === "COMPANYWALL" ? "bg-blue-500/10 text-blue-600" : "bg-border/60 text-muted"}`}>{profile.source === "COMPANYWALL" ? "CompanyWall" : "Ručno"}</span>
            <form action={refreshCompanyWall.bind(null, companyId)}><button className="text-xs text-indigo-500 hover:underline">Osvježi</button></form>
            <form action={unlinkCompanyWall.bind(null, companyId)}><button className="text-xs text-red-500 hover:underline">Ukloni</button></form>
          </div>
        )}
      </div>

      {message && <div className="mb-3 rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-amber-600">{message}</div>}

      {profile ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Identitet</p>
            <Row label="Pravni naziv" value={profile.legalName} />
            <Row label="OIB" value={profile.oib} />
            <Row label="Matični broj" value={profile.mbs} />
            <Row label="Status" value={profile.status} />
            <Row label="Pravni oblik" value={profile.legalForm} />
            <Row label="PDV" value={profile.vatStatus} />
            <Row label="Osnovana" value={profile.foundedAt ? shortDate(new Date(profile.foundedAt)) : null} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Sjedište i djelatnost</p>
            <Row label="Adresa" value={profile.address} />
            <Row label="Grad" value={[profile.postalCode, profile.city].filter(Boolean).join(" ") || null} />
            <Row label="NKD" value={profile.nkd} />
            <Row label="Djelatnost" value={profile.activity} />
            <Row label="Zaposlenih" value={profile.employeeCount} />
            <Row label="Prihod" value={profile.revenue ? `${profile.revenue} €` : null} />
            <Row label="Bonitet" value={profile.creditRating} />
          </div>
          <div className="sm:col-span-2 border-t border-border pt-2 text-xs text-muted">
            Izvor: {profile.source === "COMPANYWALL" ? "CompanyWall API" : "Ručni unos"} · Osvježeno: {profile.fetchedAt ? shortDate(new Date(profile.fetchedAt)) : "—"}
          </div>
        </div>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm text-indigo-500">Ručno poveži CompanyWall podatke (OIB + pravni podaci)</summary>
          <form action={linkCompanyWallManual.bind(null, companyId)} className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted">Pravni naziv<input name="legalName" className={inputCls} /></label>
            <label className="text-xs text-muted">OIB (11 znamenki)<input name="oib" className={inputCls} /></label>
            <label className="text-xs text-muted">Matični broj<input name="mbs" className={inputCls} /></label>
            <label className="text-xs text-muted">Status<input name="status" className={inputCls} /></label>
            <label className="text-xs text-muted">Pravni oblik<input name="legalForm" placeholder="d.o.o." className={inputCls} /></label>
            <label className="text-xs text-muted">Grad<input name="city" className={inputCls} /></label>
            <label className="text-xs text-muted">Adresa<input name="address" className={inputCls} /></label>
            <label className="text-xs text-muted">NKD / djelatnost<input name="activity" className={inputCls} /></label>
            <label className="text-xs text-muted">Zaposlenih<input name="employeeCount" type="number" className={inputCls} /></label>
            <label className="text-xs text-muted">Prihod (€)<input name="revenue" className={inputCls} /></label>
            <div className="sm:col-span-2"><button type="submit" className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white">Spremi podatke</button></div>
          </form>
        </details>
      )}
    </div>
  );
}
