import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Trash2, Send, FileText, Check, X, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { QUOTE_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader, Field, Input, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import {
  updateQuotation, addQuotationItem, removeQuotationItem, setQuotationStatus,
  sendQuotation, convertQuotationToInvoice, deleteQuotation,
} from "@/server/actions/hvac-quotations";

export const dynamic = "force-dynamic";

const LOCKED = ["CONVERTED_WORKORDER", "CONVERTED_INVOICE"];

function dv(d: Date | null | undefined) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }

export default async function QuotationPage(props: PageProps<"/hvac-b2b/ponude/[quotationId]">) {
  const ctx = await requireTenantContext();
  const { quotationId } = await props.params;
  const q = await db.hvacQuotation.findFirst({
    where: { id: quotationId, tenantId: ctx.tenantId },
    include: { customer: true, location: true, items: { orderBy: { position: "asc" } } },
  });
  if (!q) notFound();

  const st = QUOTE_STATUS[q.status];
  const locked = LOCKED.includes(q.status);

  return (
    <div className="max-w-3xl">
      <PageHeader title={q.number}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
        <a href={`/hvac-b2b/ponude/${q.id}/ispis`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-sky-500/50"><Printer size={14} /> PDF / ispis</a>
      </PageHeader>
      <Link href="/hvac-b2b/ponude" className="text-sm text-muted hover:text-foreground">← Ponude</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="font-semibold">{customerDisplayName(q.customer)}</div>
        {q.customer.oib && <div className="text-muted">OIB: {q.customer.oib}</div>}
        {q.customer.email && <div className="text-muted">{q.customer.email}</div>}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {!locked && (
          <form action={sendQuotation.bind(null, q.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"><Send size={13} /> {q.sentAt ? "Pošalji ponovno" : "Pošalji klijentu"}</button>
          </form>
        )}
        {!locked && q.status !== "ACCEPTED" && (
          <form action={setQuotationStatus.bind(null, q.id)}>
            <input type="hidden" name="status" value="ACCEPTED" />
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-300"><Check size={13} /> Označi prihvaćeno</button>
          </form>
        )}
        {!locked && !["REJECTED", "EXPIRED"].includes(q.status) && (
          <form action={setQuotationStatus.bind(null, q.id)}>
            <input type="hidden" name="status" value="REJECTED" />
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><X size={13} /> Odbijeno</button>
          </form>
        )}
        {!locked && (
          <form action={convertQuotationToInvoice.bind(null, q.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-500/5 dark:text-sky-300"><FileText size={13} /> Pretvori u račun</button>
          </form>
        )}
        {q.invoiceId && (
          <Link href={`/hvac-b2b/racuni/${q.invoiceId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"><FileText size={13} /> Otvori račun</Link>
        )}
        {q.status === "DRAFT" && (
          <form action={deleteQuotation.bind(null, q.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><Trash2 size={13} /> Obriši</button>
          </form>
        )}
      </div>

      {locked && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background-secondary p-3 text-sm text-muted">
          <Lock size={14} /> Ponuda je pretvorena i zaključana.
        </div>
      )}

      {/* Header fields */}
      {!locked && (
        <form action={updateQuotation.bind(null, q.id)}>
          <FormSection title="Detalji ponude">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vrijedi do"><Input name="validUntil" type="date" defaultValue={dv(q.validUntil)} /></Field>
              <Field label="Uvjeti plaćanja"><Input name="paymentTerms" defaultValue={q.paymentTerms ?? ""} /></Field>
            </div>
            <Field label="Napomena za klijenta"><Textarea name="notes" rows={2} defaultValue={q.notes ?? ""} /></Field>
            <SubmitButton label="Spremi" />
          </FormSection>
        </form>
      )}

      {/* Items */}
      <FormSection title="Stavke">
        {q.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {q.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.quantity)} {it.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(it.unitPriceEur))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.discountPct) > 0 ? `−${Number(it.discountPct)}%` : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.vatPct)}%</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatEur(Number(it.totalEur))}</td>
                    <td className="px-2 py-2 text-right">
                      {!locked && <form action={removeQuotationItem.bind(null, it.id, q.id)}><button className="text-muted hover:text-red-500" aria-label="Ukloni"><Trash2 size={14} /></button></form>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-background-secondary text-sm">
                <tr><td colSpan={5} className="px-3 py-1.5 text-right text-muted">Osnovica</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(q.subtotalEur))}</td><td /></tr>
                <tr><td colSpan={5} className="px-3 py-1.5 text-right text-muted">PDV</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(q.vatEur))}</td><td /></tr>
                <tr><td colSpan={5} className="px-3 py-1.5 text-right font-semibold">Ukupno</td><td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatEur(Number(q.totalEur))}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
        {!locked && (
          <form action={addQuotationItem.bind(null, q.id)} className="mt-3 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_4rem_5rem_4rem_4rem_auto]">
            <Input name="description" placeholder="Opis stavke" required />
            <Input name="quantity" type="number" step="0.01" defaultValue={1} placeholder="kol." />
            <Input name="unitPriceEur" type="number" step="0.01" placeholder="€" />
            <Input name="discountPct" type="number" step="0.01" placeholder="% pop." />
            <Input name="vatPct" type="number" step="0.01" defaultValue={ctx.tenant.vatRegistered ? 25 : 0} placeholder="% PDV" />
            <SubmitButton label="Dodaj" />
          </form>
        )}
      </FormSection>
    </div>
  );
}
