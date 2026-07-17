import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archiveJob } from "@/server/actions/bisneys-jobs";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, shortDate } from "@/lib/bisneyscrm/format";
import { matchingCandidatesForJob } from "@/lib/bisneyscrm/candidates/match-score";

export const dynamic = "force-dynamic";

export default async function JobProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const j = await db.bisneysJob.findFirst({
    where: { id, deletedAt: null },
    include: { profession: true, client: true, candidateJobs: { include: { candidate: { include: { person: true } } } } },
  });
  if (!j) notFound();

  const matches = await matchingCandidatesForJob(id, 10);

  return (
    <div className="max-w-4xl">
      <BackLink href="/bisneyscrm/jobs">Poslovi</BackLink>
      <BisneysPageHeader title={j.title} description={j.profession?.name ?? undefined}>
        <LinkButton href={`/bisneyscrm/jobs/${j.id}/uredi`} variant="ghost">Uredi</LinkButton>
        <form action={archiveJob.bind(null, j.id)}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-400">Arhiviraj</button>
        </form>
      </BisneysPageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Detalji">
          <dl>
            <DetailRow label="Profesija">{j.profession?.name ?? "—"}</DetailRow>
            <DetailRow label="Klijent">{j.client ? <Link href={`/bisneyscrm/companies/${j.client.id}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{j.client.name}</Link> : "—"}</DetailRow>
            <DetailRow label="Lokacija">{j.location ?? "—"}</DetailRow>
            <DetailRow label="Broj radnika">{j.headcount ?? "—"}</DetailRow>
            <DetailRow label="Plaća">{j.salary ?? "—"}</DetailRow>
            <DetailRow label="Vrsta ugovora">{j.contractType ?? "—"}</DetailRow>
            <DetailRow label="Početak">{shortDate(j.startDate)}</DetailRow>
            <DetailRow label="Status">{j.status ?? "—"}</DetailRow>
          </dl>
        </DetailCard>
        <DetailCard title="Uvjeti">
          <dl>
            <DetailRow label="Jezici">{j.languages ?? "—"}</DetailRow>
            <DetailRow label="Licence">{j.licenses ?? "—"}</DetailRow>
          </dl>
          {j.description && <p className="mt-3 text-sm text-muted">{j.description}</p>}
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title={`Kandidati (${j.candidateJobs.length})`}>
          {j.candidateJobs.length === 0 ? (
            <p className="text-sm text-muted">Nema povezanih kandidata. Poveži kandidata s njegovog profila.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {j.candidateJobs.map((cj) => (
                <li key={cj.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/candidates/${cj.candidateId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{cj.candidate.person.fullName}</Link>
                  <span className="text-muted">{CANDIDATE_STATUS_LABELS[cj.candidate.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title="Podudarni kandidati (objašnjivi score)">
          {matches.length === 0 ? (
            <p className="text-sm text-muted">Nema kandidata za rangiranje. Dodaj kandidate ili poveži zanimanje s poslom.</p>
          ) : (
            <ul className="space-y-2">
              {matches.map((m) => (
                <li key={m.candidateId} className="rounded-xl border border-border">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
                      <Link href={`/bisneyscrm/candidates/${m.candidateId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{m.name}</Link>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-24 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-indigo-500" style={{ width: `${m.result.score}%` }} /></span>
                        <span className="w-10 text-right font-bold tabular-nums">{m.result.score}</span>
                      </span>
                    </summary>
                    <ul className="border-t border-border px-3 py-2 text-xs">
                      {m.result.factors.map((f) => (
                        <li key={f.key} className="flex items-center justify-between py-0.5">
                          <span className="text-muted">{f.label}: {f.note}</span>
                          <span className="tabular-nums">{f.points}/{f.max}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
