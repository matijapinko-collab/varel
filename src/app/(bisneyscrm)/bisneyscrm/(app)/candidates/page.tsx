import Link from "next/link";
import { requireBisneysUser, getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { resolveProfessionIds, candidateIdsForProfessions } from "@/lib/bisneyscrm/candidates/profession-search";
import { buildAdvancedWhere, parseFilterParam } from "@/lib/bisneyscrm/candidates/filter-engine";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { FilterBar, Pagination, TextInput, SelectInput, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { CandidatesInteractive, type CandidateRow } from "@/components/bisneyscrm/candidates/candidates-interactive";
import { deleteCandidateView } from "@/server/actions/bisneys-candidate-ops";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES, shortDate } from "@/lib/bisneyscrm/format";
import { PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES, AVAILABILITY_LABELS, AVAILABILITY_VALUES } from "@/lib/bisneyscrm/candidates/labels";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function CandidatesList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const user = await getBisneysUser();
  const sp = await searchParams;
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = g("q"); const profession = g("profession"); const status = g("status");
  const profileStatus = g("profileStatus"); const availability = g("availability");
  const page = Math.max(1, parseInt(g("page") || "1", 10) || 1);

  const advFilter = parseFilterParam(g("f"));
  const adv = buildAdvancedWhere(advFilter);

  const like = { contains: q, mode: "insensitive" as const };
  const and: Record<string, unknown>[] = [];
  if (q) and.push({ OR: [{ person: { fullName: like } }, { person: { email: like } }, { person: { phone: like } }, { currentPosition: like }] });
  if (status && (CANDIDATE_STATUS_VALUES as string[]).includes(status)) and.push({ status });
  if (profileStatus && (PROFILE_STATUS_VALUES as string[]).includes(profileStatus)) and.push({ profileStatus });
  if (availability && (AVAILABILITY_VALUES as string[]).includes(availability)) and.push({ availabilityStatus: availability });
  if (Object.keys(adv.where).length) and.push(adv.where);
  if (adv.poolId) and.push({ poolMemberships: { some: { poolId: adv.poolId } } });

  // Profession filter (simple param or advanced special) via the alias engine (brief §9).
  const professionQuery = profession || adv.professionQuery;
  if (professionQuery) {
    const profIds = await resolveProfessionIds(professionQuery, { includeAliases: true, includeRelated: true });
    const candIds = await candidateIdsForProfessions(profIds);
    and.push({ id: { in: candIds.length ? candIds : ["__none__"] } });
  }

  const where: Record<string, unknown> = { deletedAt: null, ...(and.length ? { AND: and } : {}) };

  const [total, dbRows, pools, savedViews] = await Promise.all([
    db.bisneysCandidate.count({ where }),
    db.bisneysCandidate.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { person: true, professions: { where: { isPrimary: true }, include: { profession: { select: { name: true } } }, take: 1 } },
    }),
    db.bisneysTalentPool.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.bisneysSavedView.findMany({
      where: { entityType: "CANDIDATE", OR: [{ userId: user!.id }, { isShared: true }] },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;

  const rows: CandidateRow[] = dbRows.map((c) => ({
    id: c.id,
    name: c.person.fullName,
    profession: c.professions[0]?.profession.name ?? "",
    city: c.person.city ?? "",
    status: c.status,
    statusLabel: CANDIDATE_STATUS_LABELS[c.status],
    profileLabel: PROFILE_STATUS_LABELS[c.profileStatus],
    created: shortDate(c.createdAt),
    tags: c.tags ?? [],
  }));

  const params = { ...(q ? { q } : {}), ...(profession ? { profession } : {}), ...(status ? { status } : {}), ...(profileStatus ? { profileStatus } : {}), ...(availability ? { availability } : {}), ...(g("f") ? { f: g("f") } : {}) };
  const returnTo = `/bisneyscrm/candidates${g("f") ? `?f=${encodeURIComponent(g("f"))}` : ""}`;

  return (
    <div>
      <BisneysPageHeader title="Kandidati" description={`${total} kandidata u bazi`}>
        <LinkButton href="/bisneyscrm/talent-pools" variant="ghost">Talent pools</LinkButton>
        <LinkButton href="/bisneyscrm/candidates/import" variant="ghost">Uvoz</LinkButton>
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

      {savedViews.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Spremljeni prikazi:</span>
          {savedViews.map((v) => {
            const href = `/bisneyscrm/candidates?f=${encodeURIComponent(JSON.stringify(v.filters))}`;
            return (
              <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-xs">
                <Link href={href} className="hover:text-indigo-500">{v.name}{v.isShared ? " ↗" : ""}</Link>
                <form action={deleteCandidateView.bind(null, v.id)}><button className="rounded-full px-1.5 text-muted hover:text-red-500" title="Obriši prikaz">×</button></form>
              </span>
            );
          })}
        </div>
      )}

      <CandidatesInteractive rows={rows} pools={pools} initialFilter={advFilter} returnTo={returnTo} />
      <Pagination page={page} pageCount={pageCount} params={params} />
    </div>
  );
}
