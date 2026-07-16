import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { ensureRelationshipTypes } from "@/lib/bisneyscrm/relationships";
import { buildNetwork } from "@/lib/bisneyscrm/relationships/network";
import { BackLink, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { NetworkGraph } from "@/components/bisneyscrm/relationships/network-graph";

export const dynamic = "force-dynamic";

export default async function NetworkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  await ensureRelationshipTypes();
  const sp = await searchParams;
  const personId = typeof sp.personId === "string" ? sp.personId : "";
  const companyId = typeof sp.companyId === "string" ? sp.companyId : "";
  const depth = Math.min(Math.max(parseInt(typeof sp.depth === "string" ? sp.depth : "1", 10) || 1, 1), 3);

  const hasFocus = !!personId || !!companyId;
  const network = hasFocus ? await buildNetwork({ personId: personId || undefined, companyId: companyId || undefined, depth, includeCompanies: true }) : null;

  const focusName = personId
    ? (await db.bisneysPerson.findUnique({ where: { id: personId }, select: { fullName: true } }))?.fullName
    : companyId
      ? (await db.bisneysCompany.findUnique({ where: { id: companyId }, select: { name: true } }))?.name
      : null;

  const people = hasFocus ? [] : await db.bisneysPerson.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" }, take: 500, select: { id: true, fullName: true } });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink href="/bisneyscrm/relationships">Osobe i odnosi</BackLink>
          <h1 className="text-xl font-bold">Mreža odnosa{focusName ? ` — ${focusName}` : ""}</h1>
        </div>
        {hasFocus && network && <span className="text-sm text-muted">{network.nodes.length} čvorova · {network.edges.length} veza</span>}
      </div>

      {!hasFocus ? (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-card">
          <form method="get" className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted">Odaberite osobu da otvorite njezinu zvjezdanu mrežu odnosa.</p>
            <SelectInput name="personId" defaultValue="" className="w-72"><option value="">Odaberi osobu…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</SelectInput>
            <button type="submit" className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Otvori mrežu</button>
          </form>
        </div>
      ) : network && network.nodes.length <= (companyId ? 1 : 1) ? (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-card text-center">
          <div className="p-8">
            <p className="text-sm font-medium">Ova osoba još nema evidentiranih odnosa.</p>
            <p className="mt-1 text-sm text-muted">Dodajte prvi odnos s profila osobe da izgradite mrežu.</p>
            {personId && <Link href={`/bisneyscrm/people/${personId}`} className="mt-3 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Otvori profil</Link>}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1"><NetworkGraph network={network!} depth={depth} /></div>
      )}
    </div>
  );
}
