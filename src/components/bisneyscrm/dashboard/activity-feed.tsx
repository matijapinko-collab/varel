import Link from "next/link";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_SOURCE_LABELS, dateTime } from "@/lib/bisneyscrm/format";
import type { BisneysActivity } from "@/generated/prisma/client";

function entityHref(a: Pick<BisneysActivity, "companyId" | "candidateId" | "jobId">): string | null {
  if (a.companyId) return `/bisneyscrm/companies/${a.companyId}`;
  if (a.candidateId) return `/bisneyscrm/candidates/${a.candidateId}`;
  if (a.jobId) return `/bisneyscrm/jobs/${a.jobId}`;
  return null;
}

/** Global activity feed (brief §22). Each row: who / what / old→new / when / source. */
export function ActivityFeed({ activities }: { activities: BisneysActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted">Još nema aktivnosti u odabranom razdoblju.</p>;
  }
  return (
    <ul className="space-y-3">
      {activities.map((a) => {
        const href = entityHref(a);
        const label = ACTIVITY_TYPE_LABELS[a.type] ?? a.type;
        const change = a.oldValue || a.newValue ? `${a.oldValue ?? "—"} → ${a.newValue ?? "—"}` : null;
        return (
          <li key={a.id} className="flex gap-3 text-sm">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.source === "TRELLO" ? "bg-sky-400" : "bg-indigo-400"}`} />
            <div className="min-w-0">
              <span className="font-medium">{a.actorName ?? "Sustav"}</span>{" "}
              <span className="text-muted">— {label}</span>
              {change && <span className="text-muted"> · {change}</span>}
              {href && <> · <Link href={href} className="text-indigo-600 hover:underline dark:text-indigo-300">otvori</Link></>}
              <div className="text-xs text-muted">{dateTime(a.occurredAt)} · {ACTIVITY_SOURCE_LABELS[a.source] ?? a.source}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
