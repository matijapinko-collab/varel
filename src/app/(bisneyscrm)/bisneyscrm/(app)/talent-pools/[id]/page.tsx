import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { removeFromPool, deleteTalentPool } from "@/server/actions/bisneys-candidate-ops";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS } from "@/lib/bisneyscrm/format";
import { shortDate } from "@/lib/bisneyscrm/format";
import type { BisneysCandidateStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function TalentPoolDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const pool = await db.bisneysTalentPool.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { addedAt: "desc" },
        include: { candidate: { include: { person: { select: { fullName: true, city: true } } } } },
      },
    },
  });
  if (!pool) notFound();

  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/talent-pools">Talent pools</BackLink>
      <BisneysPageHeader title={pool.name} description={pool.description || `${pool.members.length} kandidata`}>
        <form action={deleteTalentPool.bind(null, pool.id)}>
          <button className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10">Obriši pool</button>
        </form>
      </BisneysPageHeader>

      <DetailCard title={`Članovi (${pool.members.length})`}>
        {pool.members.length === 0 ? (
          <p className="text-sm text-muted">Nema kandidata. Dodajte ih bulk-akcijom iz liste kandidata.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pool.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  <Link href={`/bisneyscrm/candidates/${m.candidateId}`} className="font-medium hover:text-indigo-500">{m.candidate.person.fullName}</Link>
                  <span className="ml-2 text-xs text-muted">{m.candidate.person.city || ""} · {CANDIDATE_STATUS_LABELS[m.candidate.status as BisneysCandidateStatus]} · dodan {shortDate(m.addedAt)}</span>
                </span>
                <form action={removeFromPool.bind(null, pool.id, m.candidateId)}>
                  <button className="rounded-lg border border-border px-2 py-1 text-xs text-red-500 hover:bg-red-500/10">Ukloni</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  );
}
