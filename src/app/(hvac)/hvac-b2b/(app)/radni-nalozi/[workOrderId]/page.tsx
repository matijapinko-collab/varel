import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MapPin, Printer, Trash2, Lock, Send } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { WORK_ORDER_STATUS, PRIORITY, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { WoPhotoUpload } from "@/components/hvac/b2b/wo-photos";
import { SignaturePad } from "@/components/hvac/b2b/signature-pad";
import {
  updateWorkOrder, setWorkOrderStatus, addWorkOrderItem, removeWorkOrderItem,
  removeWorkOrderPhoto, finalizeWorkOrder, markWorkOrderSent,
} from "@/server/actions/hvac-workorders";
import type { HvacWorkOrderStatus, HvacWorkOrderItemKind, HvacPriority } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const FLOW: HvacWorkOrderStatus[] = ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "WAITING_PARTS"];
const KIND_LABEL: Record<HvacWorkOrderItemKind, string> = { LABOR: "Rad", MATERIAL: "Materijal", PART: "Dio" };

function dv(d: Date | null | undefined) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }

export default async function WorkOrderPage(props: PageProps<"/hvac-b2b/radni-nalozi/[workOrderId]">) {
  const ctx = await requireTenantContext();
  const { workOrderId } = await props.params;

  const wo = await db.hvacWorkOrder.findFirst({
    where: { id: workOrderId, tenantId: ctx.tenantId, deletedAt: null },
    include: {
      customer: true, location: true, unit: true, service: true, technician: true,
      items: { orderBy: { position: "asc" } }, photos: { orderBy: { createdAt: "asc" } }, signature: true,
    },
  });
  if (!wo) notFound();

  const technicians = await db.hvacTechnician.findMany({ where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  // Resolve photo + signature image URLs (assets are stored separately).
  const assetIds = [...wo.photos.map((p) => p.fileAssetId), wo.signature?.fileAssetId].filter((x): x is string => Boolean(x));
  const assets = assetIds.length ? await db.hvacFileAsset.findMany({ where: { tenantId: ctx.tenantId, id: { in: assetIds } }, select: { id: true, url: true } }) : [];
  const urlOf = (id: string | null | undefined) => assets.find((a) => a.id === id)?.url ?? null;

  const locked = ["COMPLETED", "SENT"].includes(wo.status);
  const st = WORK_ORDER_STATUS[wo.status];
  const maps = wo.location?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([wo.location.address, wo.location.city].filter(Boolean).join(", "))}` : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title={wo.number}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[PRIORITY[wo.priority].tone]}`}>{PRIORITY[wo.priority].label}</span>
        <a href={`/hvac-b2b/radni-nalozi/${wo.id}/ispis`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-sky-500/50"><Printer size={14} /> PDF / ispis</a>
      </PageHeader>
      <Link href="/hvac-b2b/radni-nalozi" className="text-sm text-muted hover:text-foreground">← Radni nalozi</Link>

      {/* Customer / location / device */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="font-semibold">{customerDisplayName(wo.customer)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-muted">
          {wo.customer.phone && <a href={`tel:${wo.customer.phone}`} className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-300"><Phone size={13} /> {wo.customer.phone}</a>}
          {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-300"><MapPin size={13} /> Navigacija</a>}
          {wo.location && <span>{[wo.location.address, wo.location.city].filter(Boolean).join(", ")}</span>}
        </div>
        {wo.unit && <div className="mt-1 text-muted">Uređaj: {[wo.unit.manufacturer, wo.unit.model].filter(Boolean).join(" ") || wo.unit.internalName}</div>}
        {wo.service && <div className="text-muted">Usluga: {wo.service.name}</div>}
      </div>

      {locked && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <span className="inline-flex items-center gap-1.5"><Lock size={14} /> Nalog je zaključan potpisom {wo.completedAt ? `· ${new Date(wo.completedAt).toLocaleDateString("hr-HR")}` : ""}</span>
          {wo.status === "COMPLETED" && (
            <form action={markWorkOrderSent.bind(null, wo.id)}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold"><Send size={13} /> Označi poslano</button>
            </form>
          )}
        </div>
      )}

      {/* Status flow */}
      {!locked && (
        <div className="mt-3 flex flex-wrap gap-2">
          {FLOW.filter((s) => s !== wo.status).map((s) => (
            <form key={s} action={setWorkOrderStatus.bind(null, wo.id)}>
              <input type="hidden" name="status" value={s} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-sky-500/50">{WORK_ORDER_STATUS[s].label}</button>
            </form>
          ))}
        </div>
      )}

      {/* Work details */}
      {!locked ? (
        <form action={updateWorkOrder.bind(null, wo.id)}>
          <FormSection title="Izvedeni radovi">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Majstor"><Select name="technicianId" defaultValue={wo.technicianId ?? ""}><option value="">Nedodijeljeno</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
              <Field label="Prioritet"><Select name="priority" defaultValue={wo.priority}>{(Object.keys(PRIORITY) as HvacPriority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}</Select></Field>
            </div>
            <Field label="Opis kvara"><Textarea name="issueDescription" rows={2} defaultValue={wo.issueDescription ?? ""} /></Field>
            <Field label="Izvedeni radovi"><Textarea name="workPerformed" rows={3} defaultValue={wo.workPerformed ?? ""} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interna bilješka"><Textarea name="technicianNotes" rows={2} defaultValue={wo.technicianNotes ?? ""} /></Field>
              <Field label="Bilješka za klijenta"><Textarea name="customerNotes" rows={2} defaultValue={wo.customerNotes ?? ""} /></Field>
            </div>
            <Field label="Preporuka"><Textarea name="recommendation" rows={2} defaultValue={wo.recommendation ?? ""} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sljedeći servis"><Input name="nextServiceDate" type="date" defaultValue={dv(wo.nextServiceDate)} /></Field>
              <Field label="Trajanje rada (min)"><Input name="laborMinutes" type="number" defaultValue={wo.laborMinutes ?? ""} /></Field>
            </div>
            <SubmitButton label="Spremi nalog" />
          </FormSection>
        </form>
      ) : (
        <FormSection title="Izvedeni radovi">
          {wo.workPerformed && <p className="text-sm">{wo.workPerformed}</p>}
          {wo.recommendation && <p className="mt-2 text-sm text-muted">Preporuka: {wo.recommendation}</p>}
        </FormSection>
      )}

      {/* Items / materials */}
      <FormSection title="Materijali i rad">
        {wo.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {wo.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2"><span className="text-xs text-muted">{KIND_LABEL[it.kind]}</span><div>{it.description}</div></td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{Number(it.quantity)} {it.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatEur(Number(it.unitPriceEur))}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatEur(Number(it.totalEur))}</td>
                    <td className="px-2 py-2 text-right">
                      {!locked && <form action={removeWorkOrderItem.bind(null, it.id, wo.id)}><button className="text-muted hover:text-red-500" aria-label="Ukloni"><Trash2 size={14} /></button></form>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-background-secondary text-sm">
                <tr><td colSpan={3} className="px-3 py-1.5 text-right text-muted">Osnovica</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(wo.subtotalEur ?? 0))}</td><td /></tr>
                <tr><td colSpan={3} className="px-3 py-1.5 text-right text-muted">PDV</td><td className="px-3 py-1.5 text-right tabular-nums">{formatEur(Number(wo.vatEur ?? 0))}</td><td /></tr>
                <tr><td colSpan={3} className="px-3 py-1.5 text-right font-semibold">Ukupno</td><td className="px-3 py-1.5 text-right font-bold tabular-nums">{formatEur(Number(wo.totalEur ?? 0))}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
        {!locked && (
          <form action={addWorkOrderItem.bind(null, wo.id)} className="mt-3 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[7rem_1fr_5rem_4rem_6rem_auto]">
            <Select name="kind" defaultValue="MATERIAL">{(Object.keys(KIND_LABEL) as HvacWorkOrderItemKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select>
            <Input name="description" placeholder="Opis stavke" required />
            <Input name="quantity" type="number" step="0.01" defaultValue={1} placeholder="kol." />
            <Input name="unit" defaultValue="kom" placeholder="jed." />
            <Input name="unitPriceEur" type="number" step="0.01" placeholder="€" />
            <SubmitButton label="Dodaj" />
          </form>
        )}
      </FormSection>

      {/* Photos */}
      <FormSection title="Fotografije">
        {wo.photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {wo.photos.map((p) => {
              const url = urlOf(p.fileAssetId);
              return (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border">
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={p.kind} className="aspect-square w-full object-cover" />
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-semibold text-white">{p.kind}</span>
                  {!locked && (
                    <form action={removeWorkOrderPhoto.bind(null, p.id, wo.id)} className="absolute right-1 top-1">
                      <button className="grid h-6 w-6 place-items-center rounded bg-black/60 text-white opacity-0 group-hover:opacity-100" aria-label="Ukloni"><Trash2 size={12} /></button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!locked ? <WoPhotoUpload workOrderId={wo.id} /> : wo.photos.length === 0 && <p className="text-sm text-muted">Nema fotografija.</p>}
      </FormSection>

      {/* Signature / completion */}
      {wo.signature ? (
        <FormSection title="Potpis">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div>Potpisao/la: <span className="font-semibold">{wo.signature.signedByName}</span></div>
            <div className="text-muted">{new Date(wo.signature.signedAt).toLocaleString("hr-HR")}</div>
            {urlOf(wo.signature.fileAssetId) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlOf(wo.signature.fileAssetId)!} alt="Potpis" className="mt-2 h-24 rounded border border-border bg-white p-1" />
            )}
          </div>
        </FormSection>
      ) : (
        !locked && (
          <div className="mt-6">
            <SignaturePad workOrderId={wo.id} finalize={finalizeWorkOrder.bind(null, wo.id)} />
          </div>
        )
      )}
    </div>
  );
}
