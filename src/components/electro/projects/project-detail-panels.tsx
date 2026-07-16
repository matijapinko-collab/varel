"use client";

import { useActionState } from "react";
import type { ElectroProjectStatus } from "@/generated/prisma/client";
import {
  electroChangeProjectStatus,
  electroSetProjectMembers,
  type ElectroProjectResult,
} from "@/server/actions/electro-projects";
import {
  electroAddPhase,
  electroUpdatePhase,
  electroDeletePhase,
  electroAddLocation,
  electroDeleteLocation,
  type ElectroStructureResult,
} from "@/server/actions/electro-project-structure";
import { ELECTRO_PROJECT_STATUS_LABELS } from "@/lib/electro/projects";
import { ELECTRO_LOCATION_TYPE_LABELS, ELECTRO_PHASE_STATUS_LABELS } from "@/lib/electro/investor-labels";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

// ── Status ──
export function ElectroProjectStatusChanger({
  projectId,
  allowedTargets,
}: {
  projectId: string;
  allowedTargets: ElectroProjectStatus[];
}) {
  const [state, action, pending] = useActionState<ElectroProjectResult, FormData>(
    (prev, form) => electroChangeProjectStatus(prev, form),
    {}
  );
  if (allowedTargets.length === 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="toStatus" className={`${electroInputCls} !w-48`} aria-label="Novi status">
        {allowedTargets.map((s) => <option key={s} value={s}>{ELECTRO_PROJECT_STATUS_LABELS[s]}</option>)}
      </select>
      <input name="reason" placeholder="Razlog (ako se traži)" className={`${electroInputCls} !w-56`} aria-label="Razlog" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Promijeni status"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}

// ── Members ──
type UserOption = { id: string; name: string };
export function ElectroProjectMembers({
  projectId,
  allUsers,
  memberIds,
}: {
  projectId: string;
  allUsers: UserOption[];
  memberIds: string[];
}) {
  const [state, action, pending] = useActionState<ElectroProjectResult, FormData>(
    (prev, form) => electroSetProjectMembers(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {allUsers.map((u) => (
          <label key={u.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
            <input type="checkbox" name="memberIds" value={u.id} defaultChecked={memberIds.includes(u.id)} className="accent-emerald-600" />
            {u.name}
          </label>
        ))}
      </div>
      <button type="submit" disabled={pending} className={electroSecondaryBtnCls}>{pending ? "…" : "Spremi članove tima"}</button>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
    </form>
  );
}

// ── Phases ──
type Phase = { id: string; name: string; status: string; progressPercent: number };
function AddPhaseForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<ElectroStructureResult, FormData>(
    (prev, form) => electroAddPhase(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="name" placeholder="Naziv faze" required className={`${electroInputCls} !w-56`} aria-label="Naziv faze" />
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj fazu"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}
function PhaseRow({ projectId, phase }: { projectId: string; phase: Phase }) {
  const [, action, pending] = useActionState<ElectroStructureResult, FormData>(
    (prev, form) => electroUpdatePhase(prev, form),
    {}
  );
  const [, del, delPending] = useActionState<ElectroStructureResult, FormData>(
    (prev, form) => electroDeletePhase(prev, form),
    {}
  );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <span className="min-w-32 flex-1 text-sm font-medium">{phase.name}</span>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="phaseId" value={phase.id} />
        <select name="status" defaultValue={phase.status} className={`${electroInputCls} !w-40 !py-1.5 text-sm`} aria-label="Status faze">
          {Object.entries(ELECTRO_PHASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input name="progressPercent" type="number" min={0} max={100} defaultValue={phase.progressPercent} className={`${electroInputCls} !w-20 !py-1.5 text-sm`} aria-label="Napredak %" />
        <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>{pending ? "…" : "Spremi"}</button>
      </form>
      <form action={del} onSubmit={(e) => { if (!window.confirm("Obrisati fazu?")) e.preventDefault(); }}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="phaseId" value={phase.id} />
        <button type="submit" disabled={delPending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>✕</button>
      </form>
    </div>
  );
}
export function ElectroProjectPhases({ projectId, phases }: { projectId: string; phases: Phase[] }) {
  return (
    <div className="space-y-2">
      {phases.map((p) => <PhaseRow key={p.id} projectId={projectId} phase={p} />)}
      {phases.length === 0 && <p className="text-sm text-muted">Još nema faza.</p>}
      <div className="pt-2"><AddPhaseForm projectId={projectId} /></div>
    </div>
  );
}

// ── Locations ──
type Loc = { id: string; name: string; type: string; parentId: string | null; depth: number };
function AddLocationForm({ projectId, parents }: { projectId: string; parents: Loc[] }) {
  const [state, action, pending] = useActionState<ElectroStructureResult, FormData>(
    (prev, form) => electroAddLocation(prev, form),
    {}
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="name" placeholder="Naziv lokacije" required className={`${electroInputCls} !w-44`} aria-label="Naziv lokacije" />
      <select name="type" className={`${electroInputCls} !w-40`} aria-label="Vrsta">
        {Object.entries(ELECTRO_LOCATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select name="parentId" className={`${electroInputCls} !w-44`} aria-label="Nadređena lokacija">
        <option value="">(korijen)</option>
        {parents.map((l) => <option key={l.id} value={l.id}>{"— ".repeat(l.depth)}{l.name}</option>)}
      </select>
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "…" : "Dodaj"}</button>
      {state.error && <p className={`${electroErrorCls} w-full`}>{state.error}</p>}
    </form>
  );
}
function DeleteLocationForm({ projectId, id }: { projectId: string; id: string }) {
  const [, action, pending] = useActionState<ElectroStructureResult, FormData>(
    (prev, form) => electroDeleteLocation(prev, form),
    {}
  );
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Obrisati lokaciju i sve podlokacije?")) e.preventDefault(); }} className="inline">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="locationId" value={id} />
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !px-2 !py-0.5 text-xs`}>✕</button>
    </form>
  );
}
export function ElectroProjectLocations({ projectId, locations }: { projectId: string; locations: Loc[] }) {
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-sm dark:border-white/10" style={{ marginLeft: l.depth * 16 }}>
            <span>{l.name} <span className="text-xs text-muted">· {ELECTRO_LOCATION_TYPE_LABELS[l.type]}</span></span>
            <DeleteLocationForm projectId={projectId} id={l.id} />
          </li>
        ))}
        {locations.length === 0 && <li className="text-sm text-muted">Još nema lokacija.</li>}
      </ul>
      <div className="pt-2"><AddLocationForm projectId={projectId} parents={locations} /></div>
    </div>
  );
}
