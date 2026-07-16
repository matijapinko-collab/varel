import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { findDuplicatePeople, findDuplicateCompanies, type DupGroup } from "@/lib/bisneyscrm/dedup";
import { mergePeople, mergeCompanies } from "@/server/actions/bisneys-dedup";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

function GroupList({ groups, action, kind }: { groups: DupGroup[]; action: (f: FormData) => void; kind: string }) {
  if (groups.length === 0) return <p className="text-sm text-muted">Nema pronađenih mogućih duplikata.</p>;
  return (
    <div className="space-y-3">
      {groups.map((g, i) => {
        const keepId = g.members[0].id;
        const mergeIds = g.members.slice(1).map((m) => m.id).join(",");
        return (
          <div key={`${kind}-${i}`} className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.reason}</div>
            <ul className="mb-2 space-y-1 text-sm">
              {g.members.map((m, j) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{m.label} <span className="text-muted">{m.sub}</span></span>
                  {j === 0 && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">zadržava se</span>}
                </li>
              ))}
            </ul>
            <form action={action}>
              <input type="hidden" name="keepId" value={keepId} />
              <input type="hidden" name="mergeIds" value={mergeIds} />
              <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90">Spoji u prvi zapis</button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

export default async function DuplicatesPage() {
  await requireBisneysUser();
  const [people, companies] = await Promise.all([findDuplicatePeople(), findDuplicateCompanies()]);

  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/settings">Postavke</BackLink>
      <BisneysPageHeader title="Duplikati" description="Mogući duplikati se ne spajaju automatski — pregledajte i potvrdite (brief §57)." />
      <div className="grid gap-4">
        <DetailCard title={`Osobe (${people.length} grupa)`}><GroupList groups={people} action={mergePeople} kind="p" /></DetailCard>
        <DetailCard title={`Tvrtke (${companies.length} grupa)`}><GroupList groups={companies} action={mergeCompanies} kind="c" /></DetailCard>
      </div>
    </div>
  );
}
