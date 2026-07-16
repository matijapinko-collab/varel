"use client";

import { useActionState } from "react";
import type { ElectroIssueStatus } from "@/generated/prisma/client";
import {
  electroChangeIssueStatus,
  electroAddIssueComment,
  type ElectroIssueResult,
} from "@/server/actions/electro-issues";
import { ELECTRO_ISSUE_STATUS_LABELS } from "@/lib/electro/workflow";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

export function ElectroIssueStatusChanger({
  issueId,
  targets,
}: {
  issueId: string;
  targets: ElectroIssueStatus[];
}) {
  const [state, action, pending] = useActionState<ElectroIssueResult, FormData>(
    (prev, form) => electroChangeIssueStatus(prev, form),
    {}
  );
  if (targets.length === 0) return <p className="text-sm text-muted">Problem je zatvoren.</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="issueId" value={issueId} />
      <select name="toStatus" className={`${electroInputCls} !w-48`} aria-label="Novi status">
        {targets.map((s) => <option key={s} value={s}>{ELECTRO_ISSUE_STATUS_LABELS[s]}</option>)}
      </select>
      <input name="actualSolution" placeholder="Opis rješenja (za Riješen)" className={`${electroInputCls} !w-56`} aria-label="Opis rješenja" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Promijeni status"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

export function ElectroIssueCommentForm({ issueId }: { issueId: string }) {
  const [state, action, pending] = useActionState<ElectroIssueResult, FormData>(
    (prev, form) => electroAddIssueComment(prev, form),
    {}
  );
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="issueId" value={issueId} />
      <input name="body" placeholder="Komentar" required className={electroInputCls} aria-label="Komentar" />
      <button type="submit" disabled={pending} className={electroSecondaryBtnCls}>{pending ? "…" : "Dodaj"}</button>
      {state.error && <p className={`${electroErrorCls} !py-0.5 text-xs`}>{state.error}</p>}
    </form>
  );
}
