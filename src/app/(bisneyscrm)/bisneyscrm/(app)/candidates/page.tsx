import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { resolveProfessionIds, candidateIdsForProfessions } from "@/lib/bisneyscrm/candidates/profession-search";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, StatusPill, TextInput, SelectInput, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES, shortDate } from "@/lib/bisneyscrm/format";
import { PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES, AVAILABILITY_LABELS, AVAILABILITY_VALUES } from "@/lib/bisneyscrm/candidates/labels";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function CandidatesList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = g("q"); const profession = g("profession"); const status = g("status");
  const profileStatus = g("profileStatus"); const availability = g("availability");
  const page = Math.max(1, parseInt(g("page") || "1", 10) || 1);

  const like = { contains: q, mode: "insensitive" as const };
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [{ person: { fullName: like } }, { person: { email: like } }, { person: { phone: like } }, { currentPosition: like }];
  if (status && (CANDIDATE_STATUS_VALUES as string[]).includes(status)) where.status = status;
  if (profileStatus && (PROFILE_STATUS_VALUES as string[]).includes(profileStatus)) where.profileStatus = profileStatus;
  if (availability && (AVAILABILITY_VALUES as string[]).includes(availability)) where.availabilityStatus = availability;

  // Profession filter via the alias engine (brief §9).
  if (profession) {
    const profIds = await resolveProfessionIds(profession, { includeAliases: true, includeRelated: true });
    const candIds = await candidateIdsForProfessions(profIds);
    where.id = { in: candIds.length ? candIds : ["__none__"] };
  }

  const [total, rows] = await Promise.all([
    db.bisneysCandidate.count({ where }),
    db.bisneysCandidate.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { person: true, professions: { where: { isPrimary: true }, include: { profession: { select: { name: true } } }, take: 1 } },
    }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;
  const params = { ...(q ? { q } : {}), ...(profession ? { profession } : {}), ...(status ? { status } : {}), ...(profileStatus ? { profileStatus } : {}), ...(availability ? { availability } : {}) };

  return (
    <div>
      <BisneysPageHeader title="Kandidati" description={`${total} kandidata u bazi`}>
        <LinkButton href="/bisneyscrm/professions" variant="ghost">Zanimanja</LinkButton>
        <LinkButton href="/bisneyscrm/candidates/novi">Novi kandidat</LinkButton>
      </BisneysPageHeader>

      <FilterBar exportHref="/api/bisneyscrm/export/candidates">
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Pretraga</label><TextInput name="q" defaultValue={q} placeholder="Ime, email, pozicija" /></div>
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Zanimanje (aliasi)</label><TextInput name="profession" defaultValue={profession} placeholder="npr. HVAC serviser" /></div>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Status profila</label>
          <SelectInput name="profileStatus" defaultValue={profileStatus}><option value="">Svi</option>{PROFILE_STATUS_VALUES.map((s) => <option key={s} value={s}>{PROFILE_STATUS_LABELS[s]}</option>)}</SelectInput>
        </div>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Dostupnost</label>
          <SelectInput name="availability" defaultValue={availability}><option value="">Sve</option>{AVAILABILITY_VALUES.map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}</SelectInput>
        </div>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Pipeline status</label>
          <SelectInput name="status" defaultValue={status}><option value="">Svi</option>{CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}</SelectInput>
        </div>
      </FilterBar>

      <DataTable
        headers={["Ime", "Zanimanje", "Pozicija", "Grad", "Iskustvo", "Dostupnost", "Status", "Unesen"]}
        empty={total === 0 ? "Nema kandidata za odabrane filtere." : undefined}
      >
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/candidates/${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.person.fullName}</Link></td>
            <td className="px-4 py-3">{c.professions[0]?.profession.name ?? "—"}</td>
            <td className="px-4 py-3">{c.currentPosition ?? "—"}</td>
            <td className="px-4 py-3">{c.person.city ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{c.yearsExperience != null ? `${c.yearsExperience} g.` : "—"}</td>
            <td className="px-4 py-3">{c.availabilityStatus ? AVAILABILITY_LABELS[c.availabilityStatus] : "—"}</td>
            <td className="px-4 py-3"><StatusPill status={c.status} label={CANDIDATE_STATUS_LABELS[c.status]} /></td>
            <td className="px-4 py-3 text-muted">{shortDate(c.createdAt)}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={params} />
    </div>
  );
}
