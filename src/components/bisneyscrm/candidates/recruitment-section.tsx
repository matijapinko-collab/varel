import Link from "next/link";
import { DetailCard, SelectInput, TextInput, StatusPill } from "@/components/bisneyscrm/shared/ui";
import { addApplication, changeApplicationStatus, addContactAttempt, scheduleInterview, interviewAction } from "@/server/actions/bisneys-recruitment";
import {
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_VALUES, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_VALUES,
  CONTACT_CHANNEL_LABELS, CONTACT_CHANNEL_VALUES, CONTACT_OUTCOME_LABELS, CONTACT_OUTCOME_VALUES, CANDIDATE_SOURCE_LABELS,
} from "@/lib/bisneyscrm/candidates/labels";
import { shortDate, dateTime } from "@/lib/bisneyscrm/format";
import type { CandidateFlags } from "@/lib/bisneyscrm/candidates/derived";
import type { BisneysCandidateApplication, BisneysContactAttempt, BisneysInterview, BisneysJob } from "@/generated/prisma/client";

type App = BisneysCandidateApplication & { job: Pick<BisneysJob, "id" | "title"> | null };
const smallInput = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-indigo-500";

/** Derived-flag badges (brief §6): computed from history, never permanent. */
export function CandidateFlagBadges({ flags }: { flags: CandidateFlags }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.noAnswer && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">Nije odgovorio{flags.noAnswerCount > 1 ? ` — ${flags.noAnswerCount} pokušaja` : ""}</span>}
      {flags.confirmedInterview && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-300">Potvrdio razgovor</span>}
      {flags.attendedInterview && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">Došao na razgovor</span>}
    </div>
  );
}

export function RecruitmentSection({
  candidateId, applications, contacts, interviews, jobs,
}: {
  candidateId: string; applications: App[]; contacts: BisneysContactAttempt[]; interviews: BisneysInterview[]; jobs: { id: string; title: string }[];
}) {
  return (
    <div className="mt-4 space-y-4">
      {/* Prijave */}
      <DetailCard title={`Prijave (${applications.length})`}>
        {applications.length > 0 && (
          <ul className="mb-4 space-y-2">
            {applications.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.job ? <Link href={`/bisneyscrm/jobs/${a.job.id}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{a.job.title}</Link> : "Bez posla"}</span>
                  <span className="flex items-center gap-2"><StatusPill status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} /><span className="text-xs text-muted">{shortDate(a.appliedAt)}{a.source ? ` · ${CANDIDATE_SOURCE_LABELS[a.source]}` : ""}</span></span>
                </div>
                <form action={changeApplicationStatus.bind(null, a.id, candidateId)} className="mt-2 flex flex-wrap gap-2">
                  <select name="status" defaultValue={a.status} className={`${smallInput} w-44`}>{APPLICATION_STATUS_VALUES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}</select>
                  <input name="reason" placeholder="Razlog / bilješka" className={`${smallInput} w-52`} />
                  <button className="rounded-lg border border-border px-3 text-xs font-semibold hover:border-indigo-500/50">Promijeni status</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addApplication.bind(null, candidateId)} className="flex flex-wrap gap-2">
          <SelectInput name="jobId" className="w-52"><option value="">Posao (opcionalno)…</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</SelectInput>
          <SelectInput name="status" defaultValue="NEW" className="w-40">{APPLICATION_STATUS_VALUES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}</SelectInput>
          <TextInput name="note" placeholder="Napomena" className="w-48" />
          <button className="rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:opacity-90">Dodaj prijavu</button>
        </form>
      </DetailCard>

      {/* Kontakti */}
      <DetailCard title={`Kontakti (${contacts.length})`}>
        {contacts.length > 0 && (
          <ul className="mb-4 space-y-1.5 text-sm">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{CONTACT_CHANNEL_LABELS[c.channel]}{c.outcome ? ` · ${CONTACT_OUTCOME_LABELS[c.outcome]}` : ""}{c.note ? ` — ${c.note}` : ""}</span>
                <span className="text-xs text-muted">{dateTime(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <form action={addContactAttempt.bind(null, candidateId)} className="flex flex-wrap gap-2">
          <SelectInput name="channel" defaultValue="CALL" className="w-32">{CONTACT_CHANNEL_VALUES.map((c) => <option key={c} value={c}>{CONTACT_CHANNEL_LABELS[c]}</option>)}</SelectInput>
          <SelectInput name="outcome" className="w-40"><option value="">Ishod…</option>{CONTACT_OUTCOME_VALUES.map((o) => <option key={o} value={o}>{CONTACT_OUTCOME_LABELS[o]}</option>)}</SelectInput>
          <TextInput name="note" placeholder="Bilješka" className="w-40" />
          <TextInput name="followUpAt" type="date" className="w-36" />
          <button className="rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:opacity-90">Zabilježi kontakt</button>
        </form>
      </DetailCard>

      {/* Razgovori */}
      <DetailCard title={`Razgovori (${interviews.length})`}>
        {interviews.length > 0 && (
          <ul className="mb-4 space-y-2">
            {interviews.map((iv) => (
              <li key={iv.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{INTERVIEW_TYPE_LABELS[iv.type]}<span className="ml-2 text-xs text-muted">{iv.scheduledAt ? dateTime(iv.scheduledAt) : "—"}</span></span>
                  <StatusPill status={iv.status} label={INTERVIEW_STATUS_LABELS[iv.status]} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["confirm", "attended", "noshow", "complete", "cancel"] as const).map((act) => (
                    <form key={act} action={interviewAction.bind(null, iv.id, candidateId, act)}>
                      <button className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-indigo-500/50">{{ confirm: "Potvrdio", attended: "Došao", noshow: "Nije došao", complete: "Završen", cancel: "Otkaži" }[act]}</button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={scheduleInterview.bind(null, candidateId)} className="flex flex-wrap gap-2">
          <SelectInput name="type" defaultValue="PHONE_SCREEN" className="w-44">{INTERVIEW_TYPE_VALUES.map((t) => <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</option>)}</SelectInput>
          <TextInput name="scheduledAt" type="datetime-local" className="w-52" />
          <SelectInput name="jobId" className="w-44"><option value="">Posao…</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</SelectInput>
          <TextInput name="locationOrLink" placeholder="Lokacija / link" className="w-40" />
          <button className="rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:opacity-90">Zakaži razgovor</button>
        </form>
      </DetailCard>
    </div>
  );
}
