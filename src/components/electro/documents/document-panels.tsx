"use client";

import { useActionState } from "react";
import {
  electroUploadNewVersion,
  electroDecideDocument,
  electroSetDocumentVisibility,
  type ElectroDocResult,
} from "@/server/actions/electro-documents";
import { ELECTRO_VISIBILITY_LABELS } from "@/lib/electro/documents";
import type { ElectroVisibility } from "@/generated/prisma/client";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls, electroOkCls } from "../ui";

export function ElectroNewVersionForm({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState<ElectroDocResult, FormData>(
    (prev, form) => electroUploadNewVersion(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input name="changeNote" placeholder="Opis izmjene" className={electroInputCls} />
      <input name="file" type="file" required className={`${electroInputCls} !py-2`} />
      <button type="submit" disabled={pending} className={electroSecondaryBtnCls}>{pending ? "Učitavanje…" : "Učitaj novu verziju"}</button>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Nova verzija je učitana i čeka odobrenje ako je tehnička.</p>}
    </form>
  );
}

export function ElectroApprovalPanel({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState<ElectroDocResult, FormData>(
    (prev, form) => electroDecideDocument(prev, form),
    {}
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input name="comment" placeholder="Komentar (opcionalno)" className={electroInputCls} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="APPROVED" disabled={pending} className={electroPrimaryBtnCls}>Odobri</button>
        <button type="submit" name="decision" value="CHANGES_REQUIRED" disabled={pending} className={electroSecondaryBtnCls}>Traži izmjene</button>
        <button type="submit" name="decision" value="REJECTED" disabled={pending} className={electroSecondaryBtnCls}>Odbij</button>
      </div>
      {state.error && <p className={electroErrorCls}>{state.error}</p>}
      {state.ok && <p className={electroOkCls}>Odluka je zabilježena.</p>}
    </form>
  );
}

export function ElectroVisibilityForm({ documentId, current }: { documentId: string; current: ElectroVisibility }) {
  const [state, action, pending] = useActionState<ElectroDocResult, FormData>(
    (prev, form) => electroSetDocumentVisibility(prev, form),
    {}
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <select name="visibility" defaultValue={current} className={`${electroInputCls} !w-44 !py-1.5 text-sm`}>
        {(Object.entries(ELECTRO_VISIBILITY_LABELS) as [ElectroVisibility, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>{pending ? "…" : "Spremi vidljivost"}</button>
      {state.error && <span className={`${electroErrorCls} !px-2 !py-0.5 text-xs`}>{state.error}</span>}
    </form>
  );
}
