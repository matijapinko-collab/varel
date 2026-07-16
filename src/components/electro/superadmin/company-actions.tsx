"use client";

import { useActionState, useState } from "react";
import type { ElectroSubscriptionStatus } from "@/generated/prisma/client";
import {
  electroApproveCompany,
  electroRejectCompany,
  electroSuspendCompany,
  electroReactivateCompany,
  electroExtendTrial,
  electroChangeCompanyPlan,
  type ElectroSaActionResult,
} from "@/server/actions/electro-superadmin";
import { electroInputCls, electroPrimaryBtnCls, electroSecondaryBtnCls, electroErrorCls } from "../ui";

type PlanOption = { key: string; name: string };

function ActionForm({
  action,
  companyId,
  children,
  submitLabel,
  confirm,
}: {
  action: (prev: ElectroSaActionResult, form: FormData) => Promise<ElectroSaActionResult>;
  companyId: string;
  children?: React.ReactNode;
  submitLabel: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<ElectroSaActionResult, FormData>(
    (prev, form) => action(prev, form),
    {}
  );
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="companyId" value={companyId} />
      {children}
      <button type="submit" disabled={pending} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>
        {pending ? "…" : submitLabel}
      </button>
      {state.error && <p className={`${electroErrorCls} w-full !py-1 text-xs`}>{state.error}</p>}
    </form>
  );
}

export function ElectroCompanyActions({
  companyId,
  status,
  plans,
  currentPlanKey,
}: {
  companyId: string;
  status: ElectroSubscriptionStatus;
  plans: PlanOption[];
  currentPlanKey: string;
}) {
  const [approveState, approveAction, approvePending] = useActionState<ElectroSaActionResult, FormData>(
    (prev, form) => electroApproveCompany(prev, form),
    {}
  );
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-2">
      {status === "PENDING_APPROVAL" && (
        <>
          <form action={approveAction} className="inline-flex items-center gap-2">
            <input type="hidden" name="companyId" value={companyId} />
            <button type="submit" disabled={approvePending} className={`${electroPrimaryBtnCls} !py-1.5 text-xs`}>
              {approvePending ? "Odobravanje…" : "Odobri i pokreni trial"}
            </button>
          </form>
          <button type="button" onClick={() => setShowReject((v) => !v)} className={`${electroSecondaryBtnCls} !py-1.5 text-xs`}>
            Odbij…
          </button>
          {approveState.error && <p className={`${electroErrorCls} text-xs`}>{approveState.error}</p>}
          {showReject && (
            <ActionForm action={electroRejectCompany} companyId={companyId} submitLabel="Potvrdi odbijanje">
              <input name="reason" placeholder="Razlog odbijanja" required className={`${electroInputCls} !w-56 !py-1.5 text-xs`} />
            </ActionForm>
          )}
        </>
      )}

      {(status === "TRIAL" || status === "ACTIVE" || status === "PAST_DUE") && (
        <ActionForm
          action={electroSuspendCompany}
          companyId={companyId}
          submitLabel="Suspendiraj"
          confirm="Suspendirati tvrtku? Korisnici gube pristup dok se ponovno ne aktivira."
        >
          <input name="reason" placeholder="Razlog suspenzije" required className={`${electroInputCls} !w-56 !py-1.5 text-xs`} />
        </ActionForm>
      )}

      {(status === "SUSPENDED" || status === "EXPIRED") && (
        <ActionForm action={electroReactivateCompany} companyId={companyId} submitLabel="Ponovno aktiviraj" />
      )}

      {(status === "TRIAL" || status === "EXPIRED") && (
        <ActionForm action={electroExtendTrial} companyId={companyId} submitLabel="Produži trial">
          <input name="days" type="number" min={1} max={90} defaultValue={7} className={`${electroInputCls} !w-20 !py-1.5 text-xs`} aria-label="Broj dana" />
        </ActionForm>
      )}

      {status !== "PENDING_APPROVAL" && status !== "CANCELLED" && (
        <ActionForm action={electroChangeCompanyPlan} companyId={companyId} submitLabel="Promijeni paket">
          <select name="planKey" defaultValue={currentPlanKey} className={`${electroInputCls} !w-40 !py-1.5 text-xs`} aria-label="Paket">
            {plans.map((p) => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
        </ActionForm>
      )}
    </div>
  );
}
