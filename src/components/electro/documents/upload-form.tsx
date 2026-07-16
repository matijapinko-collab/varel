"use client";

import { useActionState } from "react";
import { electroUploadDocument, type ElectroDocResult } from "@/server/actions/electro-documents";
import { ELECTRO_DOC_CATEGORY_LABELS, ELECTRO_VISIBILITY_LABELS } from "@/lib/electro/documents";
import type { ElectroDocCategory, ElectroVisibility } from "@/generated/prisma/client";
import { electroInputCls, electroLabelCls, electroPrimaryBtnCls, electroErrorCls } from "../ui";

type Option = { id: string; label: string };

export function ElectroDocumentUploadForm({ projects }: { projects: Option[] }) {
  const [state, action, pending] = useActionState<ElectroDocResult, FormData>(
    (prev, form) => electroUploadDocument(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="projectId" className={electroLabelCls}>Projekt *</label>
        <select id="projectId" name="projectId" required className={electroInputCls}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="title" className={electroLabelCls}>Naziv dokumenta *</label>
        <input id="title" name="title" required className={electroInputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={electroLabelCls}>Kategorija</label>
          <select id="category" name="category" className={electroInputCls}>
            {(Object.entries(ELECTRO_DOC_CATEGORY_LABELS) as [ElectroDocCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="visibility" className={electroLabelCls}>Vidljivost</label>
          <select id="visibility" name="visibility" className={electroInputCls}>
            {(Object.entries(ELECTRO_VISIBILITY_LABELS) as [ElectroVisibility, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="description" className={electroLabelCls}>Opis</label>
        <input id="description" name="description" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="changeNote" className={electroLabelCls}>Opis izmjene</label>
        <input id="changeNote" name="changeNote" placeholder="Prva verzija" className={electroInputCls} />
      </div>
      <div>
        <label htmlFor="file" className={electroLabelCls}>Datoteka *</label>
        <input id="file" name="file" type="file" required className={`${electroInputCls} !py-2`} />
        <p className="mt-1 text-xs text-muted">PDF, slike, Office, DWG. Tehnička dokumentacija ide na obavezno odobrenje inženjera.</p>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`w-full ${electroPrimaryBtnCls}`}>
        {pending ? "Učitavanje…" : "Učitaj dokument"}
      </button>
    </form>
  );
}
