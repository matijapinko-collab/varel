"use client";

import { useActionState } from "react";
import {
  electroAdvanceDailyLog,
  electroAddLogRevision,
  type ElectroLogResult,
} from "@/server/actions/electro-daily-logs";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

export function ElectroDailyLogControls({
  logId,
  status,
}: {
  logId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED";
}) {
  const [state, action, pending] = useActionState<ElectroLogResult, FormData>(
    (prev, form) => electroAdvanceDailyLog(prev, form),
    {}
  );
  const [revState, revAction, revPending] = useActionState<ElectroLogResult, FormData>(
    (prev, form) => electroAddLogRevision(prev, form),
    {}
  );

  return (
    <div className="space-y-3">
      {status !== "LOCKED" && (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="logId" value={logId} />
          {status === "DRAFT" && <button type="submit" name="advance" value="submit" disabled={pending} className={electroPrimaryBtnCls}>Predaj</button>}
          {status === "SUBMITTED" && <button type="submit" name="advance" value="approve" disabled={pending} className={electroPrimaryBtnCls}>Odobri</button>}
          {(status === "APPROVED" || status === "SUBMITTED") && (
            <button type="submit" name="advance" value="lock" disabled={pending} className={electroSecondaryBtnCls} onClick={(e) => { if (!window.confirm("Zaključati dnevnik? Nakon zaključavanja nije moguća izmjena, samo revizija.")) e.preventDefault(); }}>Zaključaj</button>
          )}
          {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
        </form>
      )}
      {status === "LOCKED" && (
        <form action={revAction} className="space-y-2">
          <input type="hidden" name="logId" value={logId} />
          <p className="text-sm text-muted">Dnevnik je zaključan. Ispravci se bilježe kao revizija.</p>
          <input name="note" placeholder="Tekst revizije" required className={electroInputCls} aria-label="Tekst revizije" />
          <button type="submit" disabled={revPending} className={electroSecondaryBtnCls}>Dodaj reviziju</button>
          {revState.error && <p className={electroErrorCls}>{revState.error}</p>}
        </form>
      )}
    </div>
  );
}
