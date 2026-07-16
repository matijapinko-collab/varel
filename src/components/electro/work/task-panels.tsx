"use client";

import { useActionState } from "react";
import type { ElectroTaskStatus } from "@/generated/prisma/client";
import {
  electroChangeTaskStatus,
  electroAddChecklistItem,
  electroToggleChecklistItem,
  type ElectroTaskResult,
} from "@/server/actions/electro-tasks";
import { ELECTRO_TASK_STATUS_LABELS } from "@/lib/electro/workflow";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

export function ElectroTaskStatusChanger({
  taskId,
  targets,
}: {
  taskId: string;
  targets: ElectroTaskStatus[];
}) {
  const [state, action, pending] = useActionState<ElectroTaskResult, FormData>(
    (prev, form) => electroChangeTaskStatus(prev, form),
    {}
  );
  if (targets.length === 0) return <p className="text-sm text-muted">Nema dostupnih prijelaza.</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <select name="toStatus" className={`${electroInputCls} !w-48`} aria-label="Novi status">
        {targets.map((s) => <option key={s} value={s}>{ELECTRO_TASK_STATUS_LABELS[s]}</option>)}
      </select>
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Promijeni status"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

export function ElectroChecklist({
  taskId,
  items,
  canEdit,
}: {
  taskId: string;
  items: { id: string; text: string; isDone: boolean }[];
  canEdit: boolean;
}) {
  const [addState, addAction, addPending] = useActionState<ElectroTaskResult, FormData>(
    (prev, form) => electroAddChecklistItem(prev, form),
    {}
  );
  const [, toggleAction] = useActionState<ElectroTaskResult, FormData>(
    (prev, form) => electroToggleChecklistItem(prev, form),
    {}
  );
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 text-sm">
            <form action={toggleAction}>
              <input type="hidden" name="itemId" value={it.id} />
              <button type="submit" className={`grid h-5 w-5 place-items-center rounded border ${it.isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/20"}`} aria-label="Označi">
                {it.isDone ? "✓" : ""}
              </button>
            </form>
            <span className={it.isDone ? "text-muted line-through" : ""}>{it.text}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">Nema stavki checkliste.</li>}
      </ul>
      {canEdit && (
        <form action={addAction} className="flex gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input name="text" placeholder="Nova stavka" className={`${electroInputCls} !py-1.5`} aria-label="Nova stavka" />
          <button type="submit" disabled={addPending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>Dodaj</button>
          {addState.error && <p className={`${electroErrorCls} !py-0.5 text-xs`}>{addState.error}</p>}
        </form>
      )}
    </div>
  );
}
