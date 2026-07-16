import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_SOURCE_LABELS, dateTime } from "@/lib/bisneyscrm/format";
import type { BisneysActivitySource, BisneysActivityType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;
const SOURCES = Object.keys(ACTIVITY_SOURCE_LABELS) as BisneysActivitySource[];
const TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as BisneysActivityType[];

function entityHref(a: { companyId: string | null; candidateId: string | null; jobId: string | null }): string | null {
  if (a.companyId) return `/bisneyscrm/companies/${a.companyId}`;
  if (a.candidateId) return `/bisneyscrm/candidates/${a.candidateId}`;
  if (a.jobId) return `/bisneyscrm/jobs/${a.jobId}`;
  return null;
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = s("q"); const source = s("source"); const type = s("type"); const from = s("from"); const to = s("to");
  const page = Math.max(1, parseInt(s("page") || "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) where.actorName = { contains: q, mode: "insensitive" };
  if (source && (SOURCES as string[]).includes(source)) where.source = source;
  if (type && (TYPES as string[]).includes(type)) where.type = type;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) { const d = new Date(from); if (!isNaN(d.getTime())) range.gte = d; }
    if (to) { const d = new Date(to); if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); range.lte = d; } }
    if (Object.keys(range).length) where.occurredAt = range;
  }

  const [total, rows] = await Promise.all([
    db.bisneysActivity.count({ where }),
    db.bisneysActivity.findMany({ where, orderBy: { occurredAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;
  const params = { ...(q ? { q } : {}), ...(source ? { source } : {}), ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };

  return (
    <div>
      <BisneysPageHeader title="Aktivnosti" description={`${total} aktivnosti`} />

      <FilterBar>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Zaposlenik</label><TextInput name="q" defaultValue={q} placeholder="Ime" /></div>
        <div className="w-40"><label className="mb-1 block text-xs text-muted">Izvor</label>
          <SelectInput name="source" defaultValue={source}><option value="">Svi</option>{SOURCES.map((x) => <option key={x} value={x}>{ACTIVITY_SOURCE_LABELS[x]}</option>)}</SelectInput>
        </div>
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Tip</label>
          <SelectInput name="type" defaultValue={type}><option value="">Svi</option>{TYPES.map((x) => <option key={x} value={x}>{ACTIVITY_TYPE_LABELS[x]}</option>)}</SelectInput>
        </div>
        <div><label className="mb-1 block text-xs text-muted">Od</label><TextInput name="from" type="date" defaultValue={from} /></div>
        <div><label className="mb-1 block text-xs text-muted">Do</label><TextInput name="to" type="date" defaultValue={to} /></div>
      </FilterBar>

      <DataTable headers={["Vrijeme", "Zaposlenik", "Aktivnost", "Promjena", "Izvor", ""]} empty={total === 0 ? "Nema aktivnosti za odabrane filtere." : undefined}>
        {rows.map((a) => {
          const href = entityHref(a);
          return (
            <tr key={a.id} className="hover:bg-soft">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{dateTime(a.occurredAt)}</td>
              <td className="px-4 py-3 font-medium">{a.actorName ?? "Sustav"}</td>
              <td className="px-4 py-3">{ACTIVITY_TYPE_LABELS[a.type] ?? a.type}</td>
              <td className="px-4 py-3 text-muted">{a.oldValue || a.newValue ? `${a.oldValue ?? "—"} → ${a.newValue ?? "—"}` : "—"}</td>
              <td className="px-4 py-3">{ACTIVITY_SOURCE_LABELS[a.source] ?? a.source}</td>
              <td className="px-4 py-3 text-right">{href && <Link href={href} className="text-sm text-indigo-600 hover:underline dark:text-indigo-300">otvori</Link>}</td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={params} />
    </div>
  );
}
