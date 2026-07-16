import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, StatusPill, TextInput, SelectInput, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES, shortDate } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function CandidatesList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const like = { contains: q, mode: "insensitive" as const };
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [
    { person: { fullName: like } }, { person: { email: like } }, { person: { phone: like } }, { currentPosition: like },
  ];
  if (status && (CANDIDATE_STATUS_VALUES as string[]).includes(status)) where.status = status;

  const [total, rows] = await Promise.all([
    db.bisneysCandidate.count({ where }),
    db.bisneysCandidate.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { person: true } }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;
  const filterParams = { ...(q ? { q } : {}), ...(status ? { status } : {}) };
  const exportHref = `/api/bisneyscrm/export/candidates`;

  return (
    <div>
      <BisneysPageHeader title="Kandidati" description={`${total} kandidata u bazi`}>
        <LinkButton href="/bisneyscrm/candidates/novi">Novi kandidat</LinkButton>
      </BisneysPageHeader>

      <FilterBar exportHref={exportHref}>
        <div className="w-64"><label className="mb-1 block text-xs text-muted">Pretraga</label><TextInput name="q" defaultValue={q} placeholder="Ime, email, pozicija" /></div>
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Status</label>
          <SelectInput name="status" defaultValue={status}>
            <option value="">Svi statusi</option>
            {CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}
          </SelectInput>
        </div>
      </FilterBar>

      <DataTable
        headers={["Ime", "Status", "Pozicija", "Grad", "Iskustvo", "Unesen"]}
        empty={total === 0 ? "Još nema kandidata. Kandidati će se pojaviti nakon Trello sinkronizacije ili ručnog unosa." : undefined}
      >
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/candidates/${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.person.fullName}</Link></td>
            <td className="px-4 py-3"><StatusPill status={c.status} label={CANDIDATE_STATUS_LABELS[c.status]} /></td>
            <td className="px-4 py-3">{c.currentPosition ?? "—"}</td>
            <td className="px-4 py-3">{c.person.city ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{c.yearsExperience != null ? `${c.yearsExperience} g.` : "—"}</td>
            <td className="px-4 py-3 text-muted">{shortDate(c.createdAt)}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={filterParams} />
    </div>
  );
}
