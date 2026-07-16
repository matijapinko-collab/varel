"use client";

import { useActionState } from "react";
import { electroCreateTask, type ElectroTaskResult } from "@/server/actions/electro-tasks";
import { electroCreateIssue, type ElectroIssueResult } from "@/server/actions/electro-issues";
import { electroCreateDailyLog, type ElectroLogResult } from "@/server/actions/electro-daily-logs";
import { ELECTRO_ISSUE_TYPE_LABELS } from "@/lib/electro/workflow";
import { ELECTRO_PROJECT_PRIORITY_LABELS } from "@/lib/electro/projects";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

type ProjectOpt = { id: string; label: string };
type UserOpt = { id: string; label: string };

export function ElectroCreateTaskForm({ projects, users }: { projects: ProjectOpt[]; users: UserOpt[] }) {
  const [state, action, pending] = useActionState<ElectroTaskResult, FormData>(
    (prev, form) => electroCreateTask(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="t-project" className={electroLabelCls}>Projekt *</label>
          <select id="t-project" name="projectId" required className={electroInputCls}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-assignee" className={electroLabelCls}>Odgovorna osoba</label>
          <select id="t-assignee" name="assigneeUserId" className={electroInputCls}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="t-title" className={electroLabelCls}>Naslov *</label>
        <input id="t-title" name="title" required className={electroInputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="t-priority" className={electroLabelCls}>Prioritet</label>
          <select id="t-priority" name="priority" className={electroInputCls}>
            {Object.entries(ELECTRO_PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-due" className={electroLabelCls}>Rok</label>
          <input id="t-due" name="dueDate" type="date" className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="t-desc" className={electroLabelCls}>Opis</label>
        <input id="t-desc" name="description" className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Stvori zadatak"}</button>
    </form>
  );
}

export function ElectroCreateIssueForm({ projects }: { projects: ProjectOpt[] }) {
  const [state, action, pending] = useActionState<ElectroIssueResult, FormData>(
    (prev, form) => electroCreateIssue(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="i-project" className={electroLabelCls}>Projekt *</label>
          <select id="i-project" name="projectId" required className={electroInputCls}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="i-type" className={electroLabelCls}>Vrsta</label>
          <select id="i-type" name="type" className={electroInputCls}>
            {Object.entries(ELECTRO_ISSUE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="i-title" className={electroLabelCls}>Naslov *</label>
        <input id="i-title" name="title" required className={electroInputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="i-priority" className={electroLabelCls}>Prioritet</label>
          <select id="i-priority" name="priority" className={electroInputCls}>
            {Object.entries(ELECTRO_PROJECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="i-desc" className={electroLabelCls}>Opis</label>
        <input id="i-desc" name="description" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="i-sol" className={electroLabelCls}>Predloženo rješenje</label>
        <input id="i-sol" name="proposedSolution" className={electroInputCls} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Prijavi problem"}</button>
    </form>
  );
}

export function ElectroCreateDailyLogForm({ projects }: { projects: ProjectOpt[] }) {
  const [state, action, pending] = useActionState<ElectroLogResult, FormData>(
    (prev, form) => electroCreateDailyLog(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="l-project" className={electroLabelCls}>Projekt *</label>
          <select id="l-project" name="projectId" required className={electroInputCls}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="l-date" className={electroLabelCls}>Datum</label>
          <input id="l-date" name="logDate" type="date" className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="l-workers" className={electroLabelCls}>Broj radnika</label>
          <input id="l-workers" name="workerCount" type="number" min={0} className={electroInputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="l-activities" className={electroLabelCls}>Odrađene aktivnosti</label>
        <textarea id="l-activities" name="activities" rows={2} className={electroInputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="l-weather" className={electroLabelCls}>Vremenski uvjeti</label>
          <input id="l-weather" name="weather" className={electroInputCls} />
        </div>
        <div>
          <label htmlFor="l-next" className={electroLabelCls}>Plan za sljedeći dan</label>
          <input id="l-next" name="nextDayPlan" className={electroInputCls} />
        </div>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Stvori dnevni zapis"}</button>
    </form>
  );
}
