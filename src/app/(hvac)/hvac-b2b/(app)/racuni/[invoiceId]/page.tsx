import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Trash2, Send, FileCheck, Ban, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { INVOICE_STATUS, PAYMENT_METHOD_LABELS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import {
  updateInvoice, addInvoiceItem, removeInvoiceItem, issueInvoice,
  recordPayment, removePayment, cancelInvoice, sendInvoice, deleteInvoice,
} from "@/server/actions/hvac-invoices";
import type { HvacPaymentMethod } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function dv(d: Date | null | undefined) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }

export default async function InvoicePage(props: PageProps<"/hvac-b2b/racuni/[invoiceId]">) {
  const ctx = await requireTenantContext();
  const { invoiceId } = await props.params;
  const inv = await db.hvacInvoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: { customer: true, items: { orderBy: { position: "asc" } }, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!inv) notFound();

  const st = INVOICE_STATUS[inv.status];
  const isDraft = inv.status === "DRAFT";
  const cancelled = inv.status === "CANCELLED";
  const paid = inv.payments.reduce((s, p) => s + Number(p.amountEur), 0);
  const outstanding = Math.max(0, Number(inv.totalEur) - paid);
  const displayNumber = isDraft ? "Nacrt računa" : inv.number;

  return (
    <div className="max-w-3xl">
      <PageHeader title={displayNumber}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
        {!isDraft && <a href={`/hvac-b2b/racuni/${inv.id}/ispis`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-sky-500/50"><Printer size={14} /> PDF / ispis</a>}
      </PageHeader>
      <Link href="/hvac-b2b/racuni" className="text-sm text-muted hover:text-foreground">← Računi</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="font-semibold">{customerDisplayName(inv.customer)}</div>
        {inv.oib && <div className="text-muted">OIB: {inv.oib}</div>}
        {inv.customer.email && <div className="text-muted">{inv.customer.email}</div>}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isDraft && (
          <form action={issueInvoice.bind(null, inv.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"><FileCheck size={13} /> Izdaj račun</button>
          </form>
        )}
        {!isDraft && !cancelled && (
          <form action={sendInvoice.bind(null, inv.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-500/5 dark:text-sky-300"><Send size={13} /> {inv.sentAt ? "Pošalji ponovno" : "Pošalji klijentu"}</button>
          </form>
        )}
        {!isDraft && !cancelled && inv.payments.length === 0 && (
          <form action={cancelInvoice.bind(null, inv.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><Ban size={13} /> Otkaži</button>
          </form>
        )}
        {isDraft && (
          <form action={deleteInvoice.bind(null, inv.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><Trash2 size={13} /> Obriši</button>
          </form>
        )}
      </div>

      {!isDraft && !cancelled && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background-secondary p-3 text-sm text-muted">
          <Lock size={14} /> Izdani račun je zaključan. Stavke se više ne mogu mijenjati.
        </div>
      )}

      {/* Billing fields — draft only */}
      {isDraft && (
        <form action={updateInvoice.bind(null, inv.id)}>
          <FormSection title="Podaci za naplatu">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="OIB"><Input name="oib" defaultValue={inv.oib ?? ""} /></Field>
              <Field label="Dospijeće"><Input name="dueDate" type="date" defaultValue={dv(inv.dueDate)} /></Field>
            </div>
            <Field label="Adresa za naplatu"><Input name="billingAddress" defaultValue={inv.billingAddress ?? ""} /></Field>
            <Field label="Način plaćanja">
              <Select name="paymentMethod" defaultValue={inv.paymentMethod ?? ""}>
                <option value="">—</option>
                {(Object.keys(PAYMENT_METHOD_LABELS) as HvacPaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </Select>
            </Field>
            <Field label="Napomena za klijenta"><Textarea name="customerNote" rows={2} defaultValue={inv.customerNote ?? ""} /></Field>
            <SubmitButton label="Spremi" />
          </FormSection>
        </form>
      )}

      {/* Items */}
      <FormSection title="Stavke">
        {inv.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {inv.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.quantity)} {it.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(it.unitPriceEur))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.vatPct)}%</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatEur(Number(it.totalEur))}</td>
                    <td className="px-2 py-2 text-right">
                      {isDraft && <form action={removeInvoiceItem.bind(null, it.id, inv.id)}><button className="text-muted hover:text-red-500" aria-label="Ukloni"><Trash2 size={14} /></button></form>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-background-secondary text-sm">
                <tr><td colSpan={4} className="px-3 py-1.5 text-right text-muted">Osnovica</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(inv.subtotalEur))}</td><td /></tr>
                <tr><td colSpan={4} className="px-3 py-1.5 text-right text-muted">PDV</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(inv.vatEur))}</td><td /></tr>
                <tr><td colSpan={4} className="px-3 py-1.5 text-right font-semibold">Ukupno</td><td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatEur(Number(inv.totalEur))}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
        {isDraft && (
          <form action={addInvoiceItem.bind(null, inv.id)} className="mt-3 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_4rem_5rem_4rem_auto]">
            <Input name="description" placeholder="Opis stavke" required />
            <Input name="quantity" type="number" step="0.01" defaultValue={1} placeholder="kol." />
            <Input name="unitPriceEur" type="number" step="0.01" placeholder="€" />
            <Input name="vatPct" type="number" step="0.01" defaultValue={ctx.tenant.vatRegistered ? 25 : 0} placeholder="% PDV" />
            <SubmitButton label="Dodaj" />
          </form>
        )}
      </FormSection>

      {/* Payments — issued only */}
      {!isDraft && !cancelled && (
        <FormSection title="Naplata">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Ukupno</div><div className="font-semibold tabular-nums">{formatEur(Number(inv.totalEur))}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Plaćeno</div><div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatEur(paid)}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Za platiti</div><div className="font-semibold tabular-nums">{formatEur(outstanding)}</div></div>
          </div>

          {inv.payments.length > 0 && (
            <ul className="mb-3 divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>{new Date(p.paidAt).toLocaleDateString("hr-HR")} · {PAYMENT_METHOD_LABELS[p.method]}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{formatEur(Number(p.amountEur))}</span>
                    <form action={removePayment.bind(null, p.id, inv.id)}><button className="text-muted hover:text-red-500" aria-label="Ukloni uplatu"><Trash2 size={14} /></button></form>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {outstanding > 0.005 && (
            <form action={recordPayment.bind(null, inv.id)} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[6rem_9rem_1fr_auto]">
              <Input name="amountEur" type="number" step="0.01" defaultValue={outstanding.toFixed(2)} placeholder="Iznos €" required />
              <Select name="method" defaultValue="BANK_TRANSFER">
                {(Object.keys(PAYMENT_METHOD_LABELS) as HvacPaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </Select>
              <Input name="note" placeholder="Napomena (opcionalno)" />
              <SubmitButton label="Zabilježi uplatu" />
            </form>
          )}
        </FormSection>
      )}
    </div>
  );
}
