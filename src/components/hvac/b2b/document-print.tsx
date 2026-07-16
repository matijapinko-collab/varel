import { formatEur } from "@/lib/hvac/format";
import { PrintButton } from "./print-button";

/** One rendered line on a quote/invoice. discountPct is shown only when > 0. */
export type DocLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceEur: number;
  discountPct?: number;
  vatPct: number;
  totalEur: number;
};

export type DocTenant = {
  name: string;
  logoUrl?: string | null;
  legalForm?: string | null;
  oib?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  iban?: string | null;
  bankName?: string | null;
  vatRegistered: boolean;
  footer?: string | null;
};

function fmtDate(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString("hr-HR") : "—";
}

/**
 * Branded, print-ready A4 quote/invoice. Shared by the authenticated print
 * routes and the public share link. Uses print-isolation CSS so nothing but
 * the document reaches the printed page.
 */
export function DocumentPrint(props: {
  kind: "quote" | "invoice";
  tenant: DocTenant;
  number: string;
  issueDate: Date;
  secondaryDate?: { label: string; date: Date | null };
  statusLabel?: string;
  customer: { name: string; oib?: string | null; addressLines: string[]; email?: string | null; phone?: string | null };
  items: DocLine[];
  subtotalEur: number;
  vatEur: number;
  totalEur: number;
  paidEur?: number;
  notes?: string | null;
  paymentTerms?: string | null;
  customerNote?: string | null;
  showPrintButton?: boolean;
}) {
  const t = props.tenant;
  const title = props.kind === "quote" ? "PONUDA" : "RAČUN";
  const anyDiscount = props.items.some((i) => (i.discountPct ?? 0) > 0);
  const tenantAddr = [t.address, [t.postalCode, t.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const outstanding = props.paidEur != null ? Math.max(0, props.totalEur - props.paidEur) : null;

  return (
    <div id="wo-print" className="mx-auto max-w-[800px] bg-white p-8 text-[13px] text-slate-900 print:p-0">
      <style>{`@media print {
        @page { margin: 16mm; }
        body { background: #fff !important; }
        body * { visibility: hidden !important; }
        #wo-print, #wo-print * { visibility: visible !important; }
        #wo-print { position: absolute; inset: 0; margin: 0; max-width: none; width: 100%; padding: 0; }
        .no-print { display: none !important; }
      }`}</style>

      {props.showPrintButton && <div className="no-print mb-6 flex justify-end"><PrintButton /></div>}

      <header className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
        <div>
          {t.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logoUrl} alt={t.name} className="mb-2 max-h-14" />
          ) : (
            <div className="text-xl font-bold">{t.name}</div>
          )}
          <div className="text-xs text-slate-600">
            {t.legalForm && <div>{t.name}, {t.legalForm}</div>}
            {tenantAddr && <div>{tenantAddr}</div>}
            {t.oib && <div>OIB: {t.oib}</div>}
            {t.phone && <div>Tel: {t.phone}</div>}
            {t.email && <div>{t.email}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{title}</div>
          <div className="font-mono text-base">{props.number}</div>
          <div className="mt-1 text-xs text-slate-600">Datum izdavanja: {fmtDate(props.issueDate)}</div>
          {props.secondaryDate && <div className="text-xs text-slate-600">{props.secondaryDate.label}: {fmtDate(props.secondaryDate.date)}</div>}
          {props.statusLabel && <div className="text-xs text-slate-600">Status: {props.statusLabel}</div>}
        </div>
      </header>

      <section className="mt-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kupac</div>
        <div className="font-semibold">{props.customer.name}</div>
        {props.customer.oib && <div className="text-xs">OIB: {props.customer.oib}</div>}
        {props.customer.addressLines.map((l, i) => <div key={i} className="text-xs">{l}</div>)}
        {props.customer.email && <div className="text-xs">{props.customer.email}</div>}
      </section>

      <section className="mt-5">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-1.5 pr-2 font-semibold">Opis</th>
              <th className="py-1.5 px-2 text-right font-semibold">Kol.</th>
              <th className="py-1.5 px-2 text-right font-semibold">Cijena</th>
              {anyDiscount && <th className="py-1.5 px-2 text-right font-semibold">Popust</th>}
              <th className="py-1.5 px-2 text-right font-semibold">PDV</th>
              <th className="py-1.5 pl-2 text-right font-semibold">Iznos</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="py-1.5 pr-2">{it.description}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{it.quantity} {it.unit}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{formatEur(it.unitPriceEur)}</td>
                {anyDiscount && <td className="py-1.5 px-2 text-right tabular-nums">{(it.discountPct ?? 0) > 0 ? `${it.discountPct}%` : "—"}</td>}
                <td className="py-1.5 px-2 text-right tabular-nums">{it.vatPct}%</td>
                <td className="py-1.5 pl-2 text-right tabular-nums">{formatEur(it.totalEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-end">
          <table className="text-xs">
            <tbody>
              <tr><td className="py-0.5 pr-6 text-right text-slate-600">Osnovica</td><td className="py-0.5 text-right tabular-nums">{formatEur(props.subtotalEur)}</td></tr>
              {t.vatRegistered && <tr><td className="py-0.5 pr-6 text-right text-slate-600">PDV</td><td className="py-0.5 text-right tabular-nums">{formatEur(props.vatEur)}</td></tr>}
              <tr className="border-t border-slate-400"><td className="py-1 pr-6 text-right font-bold">UKUPNO</td><td className="py-1 text-right font-bold tabular-nums">{formatEur(props.totalEur)}</td></tr>
              {props.paidEur != null && props.paidEur > 0 && <tr><td className="py-0.5 pr-6 text-right text-slate-600">Plaćeno</td><td className="py-0.5 text-right tabular-nums">−{formatEur(props.paidEur)}</td></tr>}
              {outstanding != null && props.paidEur! > 0 && <tr><td className="py-1 pr-6 text-right font-semibold">Za platiti</td><td className="py-1 text-right font-semibold tabular-nums">{formatEur(outstanding)}</td></tr>}
            </tbody>
          </table>
        </div>
        {!t.vatRegistered && <p className="mt-1 text-[10px] text-slate-500">Izvođač nije u sustavu PDV-a (PDV nije obračunat).</p>}
      </section>

      {props.kind === "invoice" && t.iban && (
        <section className="mt-5 rounded border border-slate-300 p-3 text-xs">
          <div className="font-semibold">Podaci za plaćanje</div>
          <div>IBAN: {t.iban}{t.bankName ? ` (${t.bankName})` : ""}</div>
          <div>Poziv na broj: {props.number}</div>
        </section>
      )}

      {props.paymentTerms && <p className="mt-4 text-xs"><span className="font-semibold">Uvjeti plaćanja:</span> {props.paymentTerms}</p>}
      {props.notes && <p className="mt-2 whitespace-pre-wrap text-xs">{props.notes}</p>}
      {props.customerNote && <p className="mt-2 whitespace-pre-wrap text-xs">{props.customerNote}</p>}

      {t.footer && <footer className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">{t.footer}</footer>}
    </div>
  );
}
