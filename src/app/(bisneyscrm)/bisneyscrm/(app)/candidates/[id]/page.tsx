import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archiveCandidate, linkCandidateToJob } from "@/server/actions/bisneys-candidates";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, StatusPill, LinkButton, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { CANDIDATE_STATUS_LABELS, money, shortDate, dateTime } from "@/lib/bisneyscrm/format";
import { PROFILE_STATUS_LABELS, EDUCATION_LEVEL_LABELS, AVAILABILITY_LABELS, RELOCATION_LABELS, CANDIDATE_SOURCE_LABELS } from "@/lib/bisneyscrm/candidates/labels";

export const dynamic = "force-dynamic";

export default async function CandidateProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;

  const c = await db.bisneysCandidate.findFirst({
    where: { id, deletedAt: null },
    include: {
      person: true,
      candidateJobs: { include: { job: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
      professions: { include: { profession: { select: { name: true } } } },
      languages: true,
      skills: { include: { skill: { select: { name: true } } } },
    },
  });
  if (!c) notFound();

  const primaryProfession = c.professions.find((p) => p.isPrimary)?.profession.name;
  const fieldWork = [
    c.fieldWorkWilling && "teren", c.multiDayField && "višednevni", c.internationalField && "međunarodni",
    c.shiftWork && "smjene", c.nightWork && "noćni", c.heightWork && "visina", c.physicalWork && "fizički",
  ].filter(Boolean).join(", ");
  const salaryRange = c.expectedSalaryMin || c.expectedSalaryMax
    ? `${c.expectedSalaryMin ? money(c.expectedSalaryMin, c.salaryCurrency ?? "EUR") : ""}${c.expectedSalaryMax ? ` – ${money(c.expectedSalaryMax, c.salaryCurrency ?? "EUR")}` : ""}`.trim()
    : c.expectedSalary;

  const [jobs, activities] = await Promise.all([
    db.bisneysJob.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, take: 100, select: { id: true, title: true } }),
    db.bisneysActivity.findMany({ where: { candidateId: c.id }, orderBy: { occurredAt: "desc" }, take: 12 }),
  ]);

  return (
    <div className="max-w-4xl">
      <BackLink href="/bisneyscrm/candidates">Kandidati</BackLink>
      <BisneysPageHeader title={c.person.fullName} description={primaryProfession ?? c.currentPosition ?? undefined}>
        <StatusPill status={c.status} label={CANDIDATE_STATUS_LABELS[c.status]} />
        <LinkButton href={`/bisneyscrm/relationships/network?personId=${c.personId}`} variant="ghost">Mreža odnosa</LinkButton>
        <LinkButton href={`/bisneyscrm/candidates/${c.id}/uredi`} variant="ghost">Uredi</LinkButton>
        <form action={archiveCandidate.bind(null, c.id)}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-400">Arhiviraj</button>
        </form>
      </BisneysPageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Kontakt">
          <dl>
            <DetailRow label="Telefon">{c.person.phone ?? "—"}</DetailRow>
            <DetailRow label="Email">{c.person.email ?? "—"}</DetailRow>
            <DetailRow label="Grad / država">{[c.person.city, c.person.country].filter(Boolean).join(", ") || "—"}</DetailRow>
          </dl>
        </DetailCard>
        <DetailCard title="Profesionalno">
          <dl>
            <DetailRow label="Trenutni poslodavac">{c.currentEmployer ?? "—"}</DetailRow>
            <DetailRow label="Senioritet">{c.seniority ?? "—"}</DetailRow>
            <DetailRow label="Iskustvo">{c.yearsExperience != null ? `${c.yearsExperience} g.` : "—"}</DetailRow>
            <DetailRow label="Očekivana plaća">{c.expectedSalary ?? "—"}</DetailRow>
            <DetailRow label="Dostupnost">{c.availability ?? "—"}</DetailRow>
            <DetailRow label="Ocjena">{c.rating != null ? `${c.rating}/5` : "—"}</DetailRow>
          </dl>
        </DetailCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DetailCard title="Profil">
          <dl>
            <DetailRow label="Status profila"><StatusPill status={c.profileStatus} label={PROFILE_STATUS_LABELS[c.profileStatus]} /></DetailRow>
            <DetailRow label="Primarno zanimanje">{primaryProfession ?? "—"}</DetailRow>
            <DetailRow label="Obrazovanje">{c.educationLevel ? EDUCATION_LEVEL_LABELS[c.educationLevel] : c.education ?? "—"}</DetailRow>
            <DetailRow label="Dostupnost">{c.availabilityStatus ? AVAILABILITY_LABELS[c.availabilityStatus] : "—"}{c.availableFrom ? ` (od ${shortDate(c.availableFrom)})` : ""}</DetailRow>
            <DetailRow label="Selidba">{c.relocationPreference ? RELOCATION_LABELS[c.relocationPreference] : "—"}</DetailRow>
            <DetailRow label="Očekivana plaća">{salaryRange ?? "—"}</DetailRow>
            <DetailRow label="Izvor">{c.candidateSource ? CANDIDATE_SOURCE_LABELS[c.candidateSource] : c.source ?? "—"}</DetailRow>
          </dl>
        </DetailCard>
        <DetailCard title="Uvjeti rada i jezici">
          <dl>
            <DetailRow label="Terenski rad">{fieldWork || "—"}</DetailRow>
            <DetailRow label="Vozačka">{c.drivingLicense ?? "—"}</DetailRow>
            <DetailRow label="Otkazni rok">{c.noticePeriodDays != null ? `${c.noticePeriodDays} dana` : "—"}</DetailRow>
          </dl>
          {c.languages.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.languages.map((l) => <span key={l.id} className="rounded-full bg-soft px-2 py-0.5 text-xs">{l.language}{l.level ? ` ${l.level}` : ""}</span>)}</div>}
          {c.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.skills.map((s) => <span key={s.id} className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-300">{s.skill.name}</span>)}</div>}
        </DetailCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DetailCard title={`Povezani poslovi (${c.candidateJobs.length})`}>
          {c.candidateJobs.length > 0 && (
            <ul className="mb-4 space-y-2 text-sm">
              {c.candidateJobs.map((cj) => (
                <li key={cj.id}><Link href={`/bisneyscrm/jobs/${cj.jobId}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{cj.job.title}</Link></li>
              ))}
            </ul>
          )}
          {jobs.length > 0 ? (
            <form action={linkCandidateToJob.bind(null, c.id)} className="flex gap-2">
              <SelectInput name="jobId" className="flex-1"><option value="">Odaberi posao…</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</SelectInput>
              <button type="submit" className="rounded-lg border border-border px-4 text-sm font-semibold hover:border-indigo-500/50">Poveži</button>
            </form>
          ) : <p className="text-sm text-muted">Nema poslova za povezivanje.</p>}
        </DetailCard>

        <DetailCard title="Povijest statusa">
          {c.statusHistory.length === 0 ? (
            <p className="text-sm text-muted">Nema promjena statusa.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {c.statusHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span>{CANDIDATE_STATUS_LABELS[(h.fromStatus ?? "") as keyof typeof CANDIDATE_STATUS_LABELS] ?? h.fromStatus ?? "—"} → <b>{CANDIDATE_STATUS_LABELS[(h.toStatus ?? "") as keyof typeof CANDIDATE_STATUS_LABELS] ?? h.toStatus}</b></span>
                  <span className="text-xs text-muted">{shortDate(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title="Aktivnosti">
          {activities.length === 0 ? <p className="text-sm text-muted">Još nema aktivnosti.</p> : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <span className="font-medium">{a.type}</span>
                    {a.oldValue || a.newValue ? <span className="text-muted"> · {a.oldValue ?? "—"} → {a.newValue ?? "—"}</span> : null}
                    <div className="text-xs text-muted">{a.actorName ?? "Sustav"} · {dateTime(a.occurredAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
