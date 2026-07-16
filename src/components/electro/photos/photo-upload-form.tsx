"use client";

import { useActionState } from "react";
import { electroUploadPhoto, type ElectroPhotoResult } from "@/server/actions/electro-photos";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

type Option = { id: string; label: string };

export function ElectroPhotoUploadForm({
  projectId,
  locations,
  phases,
}: {
  projectId: string;
  locations: Option[];
  phases: Option[];
}) {
  const [state, action, pending] = useActionState<ElectroPhotoResult, FormData>(
    (prev, form) => electroUploadPhoto(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-3 sm:grid-cols-2">
        {locations.length > 0 && (
          <div>
            <label htmlFor="locationId" className={electroLabelCls}>Lokacija</label>
            <select id="locationId" name="locationId" className={electroInputCls}>
              <option value="">—</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        )}
        {phases.length > 0 && (
          <div>
            <label htmlFor="phaseId" className={electroLabelCls}>Faza</label>
            <select id="phaseId" name="phaseId" className={electroInputCls}>
              <option value="">—</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="category" className={electroLabelCls}>Kategorija radova</label>
        <input id="category" name="category" placeholder="npr. Kabelske trase" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="comment" className={electroLabelCls}>Komentar</label>
        <input id="comment" name="comment" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="file" className={electroLabelCls}>Fotografija *</label>
        <input id="file" name="file" type="file" accept="image/*" required className={`${electroInputCls} !py-2`} />
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Fotografija je spremljena.</p>}
      <button type="submit" disabled={pending} className={electroPrimaryBtnCls}>{pending ? "Učitavanje…" : "Dodaj fotografiju"}</button>
    </form>
  );
}
