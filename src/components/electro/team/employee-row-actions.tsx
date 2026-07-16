"use client";

import { useActionState } from "react";
import type { ElectroUserStatus } from "@/generated/prisma/client";
import {
  electroSetEmployeeStatus,
  electroResendInvite,
  type ElectroTeamResult,
} from "@/server/actions/electro-team";
import { electroSecondaryBtnCls, electroErrorCls } from "../ui";

function StatusForm({
  userId,
  statusAction,
  label,
  confirm,
}: {
  userId: string;
  statusAction: string;
  label: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<ElectroTeamResult, FormData>(
    (prev, form) => electroSetEmployeeStatus(prev, form),
    {}
  );
  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="statusAction" value={statusAction} />
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !px-2.5 !py-1 text-xs`}>
        {pending ? "…" : label}
      </button>
      {state.error && <span className={`${electroErrorCls} ml-2 !px-2 !py-0.5 text-xs`}>{state.error}</span>}
    </form>
  );
}

function ResendInviteForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ElectroTeamResult, FormData>(
    (prev, form) => electroResendInvite(prev, form),
    {}
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !px-2.5 !py-1 text-xs`}>
        {pending ? "…" : state.ok ? "Pozivnica poslana ✓" : "Ponovno pošalji pozivnicu"}
      </button>
      {state.error && <span className={`${electroErrorCls} ml-2 !px-2 !py-0.5 text-xs`}>{state.error}</span>}
    </form>
  );
}

export function ElectroEmployeeRowActions({
  userId,
  status,
  isSelf,
}: {
  userId: string;
  status: ElectroUserStatus;
  isSelf: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "INVITED" && <ResendInviteForm userId={userId} />}
      {(status === "INACTIVE" || status === "SUSPENDED") && (
        <StatusForm userId={userId} statusAction="activate" label="Aktiviraj" />
      )}
      {status === "ACTIVE" && (
        <StatusForm
          userId={userId}
          statusAction="deactivate"
          label="Deaktiviraj"
          confirm={isSelf ? "Deaktivirati vlastiti račun? Odmah gubite pristup." : "Deaktivirati korisnika? Trenutačno se odjavljuje sa svih uređaja."}
        />
      )}
      {status !== "ARCHIVED" && (
        <StatusForm
          userId={userId}
          statusAction="archive"
          label="Arhiviraj"
          confirm="Arhivirati korisnika? Povijest (dokumenti, zapisi, potrošnja) ostaje sačuvana, a račun se trajno zatvara."
        />
      )}
    </div>
  );
}
