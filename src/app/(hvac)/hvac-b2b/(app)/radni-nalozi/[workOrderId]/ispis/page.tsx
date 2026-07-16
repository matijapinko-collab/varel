import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { WORK_ORDER_STATUS, PRIORITY, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PrintButton } from "@/components/hvac/b2b/print-button";
import type { HvacWorkOrderItemKind } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<HvacWorkOrderItemKind, string> = { LABOR: "Rad", MATERIAL: "Materijal", PART: "Dio" };

function fmtDate(d: Date | null | undefined) { return d ? new Date(d).toLocaleDateString("hr-HR") : "—"; }

export default async function WorkOrderPrintPage(props: PageProps<"/hvac-b2b/radni-nalozi/[workOrderId]/ispis">) {
  const ctx = await requireTenantContext();
  const { workOrderId } = await props.params;
  const t = ctx.tenant;

  const wo = await db.hvacWorkOrder.findFirst({
    where: { id: workOrderId, tenantId: ctx.tenantId, deletedAt: null },
    include: {
      customer: true, location: true, unit: true, service: true, technician: true,
      items: { orderBy: { position: "asc" } }, signature: true,
    },
  });
  if (!wo) notFound();

  const sigUrl = wo.signature?.fileAssetId
    ? (await db.hvacFileAsset.findFirst({ where: { tenantId: ctx.tenantId, id: wo.signature.fileAssetId }, select: { url: true } }))?.url ?? null
    : null;

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

      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>

      {/* Letterhead */}
      <header className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
        <div>
          {t.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logoUrl} alt={t.name} className="mb-2 max-h-14" />
          ) : (
            <div className="text-xl font-bold">{t.name}</div>
          )}
          <div className="text-xs text-slate-600">
            {t.legalForm && <div>{t.name}{t.legalForm ? `, ${t.legalForm}` : ""}</div>}
            {[t.address, [t.postalCode, t.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") && (
              <div>{[t.address, [t.postalCode, t.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>
            )}
            {t.oib && <div>OIB: {t.oib}</div>}
            {t.phone && <div>Tel: {t.phone}</div>}
            {t.email && <div>{t.email}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">RADNI NALOG</div>
          <div className="font-mono text-base">{wo.number}</div>
          <div className="mt-1 text-xs text-slate-600">Datum: {fmtDate(wo.completedAt ?? wo.createdAt)}</div>
          <div className="text-xs text-slate-600">Status: {WORK_ORDER_STATUS[wo.status].label}</div>
          <div className="text-xs text-slate-600">Prioritet: {PRIORITY[wo.priority].label}</div>
        </div>
      </header>

      {/* Parties */}
      <section className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Klijent</div>
          <div className="font-semibold">{customerDisplayName(wo.customer)}</div>
          {wo.customer.oib && <div className="text-xs">OIB: {wo.customer.oib}</div>}
          {wo.location && <div className="text-xs">{[wo.location.address, [wo.location.postalCode, wo.location.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>}
          {wo.customer.phone && <div className="text-xs">Tel: {wo.customer.phone}</div>}
          {wo.customer.email && <div className="text-xs">{wo.customer.email}</div>}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Detalji</div>
          {wo.service && <div className="text-xs">Usluga: {wo.service.name}</div>}
          {wo.unit && <div className="text-xs">Uređaj: {[wo.unit.manufacturer, wo.unit.model].filter(Boolean).join(" ") || wo.unit.internalName}</div>}
          {wo.unit?.serialNumber && <div className="text-xs">Ser. br.: {wo.unit.serialNumber}</div>}
          {wo.technician && <div className="text-xs">Majstor: {wo.technician.name}</div>}
          {wo.laborMinutes != null && <div className="text-xs">Trajanje: {wo.laborMinutes} min</div>}
        </div>
      </section>

      {/* Work described */}
      {(wo.issueDescription || wo.workPerformed) && (
        <section className="mt-5 space-y-3">
          {wo.issueDescription && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Opis kvara</div>
              <p className="whitespace-pre-wrap text-xs">{wo.issueDescription}</p>
            </div>
          )}
          {wo.workPerformed && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Izvedeni radovi</div>
              <p className="whitespace-pre-wrap text-xs">{wo.workPerformed}</p>
            </div>
          )}
        </section>
      )}

      {/* Items */}
      {wo.items.length > 0 && (
        <section className="mt-5">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1.5 pr-2 font-semibold">Stavka</th>
                <th className="py-1.5 px-2 font-semibold">Vrsta</th>
                <th className="py-1.5 px-2 text-right font-semibold">Kol.</th>
                <th className="py-1.5 px-2 text-right font-semibold">Cijena</th>
                <th className="py-1.5 pl-2 text-right font-semibold">Iznos</th>
              </tr>
            </thead>
            <tbody>
              {wo.items.map((it) => (
                <tr key={it.id} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2">{it.description}</td>
                  <td className="py-1.5 px-2 text-slate-500">{KIND_LABEL[it.kind]}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{Number(it.quantity)} {it.unit}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{formatEur(Number(it.unitPriceEur))}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">{formatEur(Number(it.totalEur))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="py-1 pr-2 text-right text-slate-600">Osnovica</td><td className="py-1 pl-2 text-right tabular-nums">{formatEur(Number(wo.subtotalEur ?? 0))}</td></tr>
              {t.vatRegistered && <tr><td colSpan={4} className="py-1 pr-2 text-right text-slate-600">PDV</td><td className="py-1 pl-2 text-right tabular-nums">{formatEur(Number(wo.vatEur ?? 0))}</td></tr>}
              <tr className="border-t border-slate-400"><td colSpan={4} className="py-1.5 pr-2 text-right font-bold">UKUPNO</td><td className="py-1.5 pl-2 text-right font-bold tabular-nums">{formatEur(Number(wo.totalEur ?? 0))}</td></tr>
            </tfoot>
          </table>
          {!t.vatRegistered && <p className="mt-1 text-[10px] text-slate-500">Izvođač nije u sustavu PDV-a.</p>}
        </section>
      )}

      {wo.recommendation && (
        <section className="mt-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preporuka</div>
          <p className="whitespace-pre-wrap text-xs">{wo.recommendation}</p>
        </section>
      )}
      {wo.nextServiceDate && <p className="mt-2 text-xs">Preporučeni sljedeći servis: <strong>{fmtDate(wo.nextServiceDate)}</strong></p>}

      {/* Signatures */}
      <section className="mt-10 grid grid-cols-2 gap-10">
        <div className="text-center">
          <div className="h-16">
            {wo.technician && <div className="pt-6 text-xs text-slate-500">{wo.technician.name}</div>}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-600">Izvođač</div>
        </div>
        <div className="text-center">
          <div className="flex h-16 items-end justify-center">
            {sigUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sigUrl} alt="Potpis" className="max-h-16" />
            ) : null}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-600">
            {wo.signature ? wo.signature.signedByName : "Klijent"}
            {wo.signature && <div className="text-[10px]">{new Date(wo.signature.signedAt).toLocaleString("hr-HR")}</div>}
          </div>
        </div>
      </section>

      {wo.signature?.consentText && <p className="mt-3 text-[9px] leading-snug text-slate-400">{wo.signature.consentText}</p>}

      {t.documentFooter && <footer className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">{t.documentFooter}</footer>}
    </div>
  );
}
