import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, FormSection, Field, Input, Textarea, SubmitButton } from "@/components/admin/ui";
import { isEmailConfigured } from "@/lib/email";
import {
  getPaymentInstructions,
  saveReportSettings,
  approveAndSendOffer,
  markPaid,
  generateReport,
  approveAndSendReport,
  togglePublicShare,
  rejectRequest,
  archiveRequest,
} from "@/server/actions/llm-reports";
import { offerEmail, packageSummary } from "@/lib/llm-scanner/emails";
import type { Lang } from "@/lib/llm-scanner/data";

export const dynamic = "force-dynamic";

type ScanJson = {
  scores?: Record<string, number>;
  facts?: Record<string, unknown>;
  topIssues?: { id: string; priority: string; text: string }[];
};

export default async function LlmReportDetailPage(props: PageProps<"/administracija/llm-reports/[id]">) {
  const { id } = await props.params;
  const r = await db.llmScanRequest.findUnique({ where: { id } });
  if (!r) notFound();

  const [paymentInstructions, emailReady] = await Promise.all([getPaymentInstructions(), Promise.resolve(isEmailConfigured())]);
  const lang = (r.preferredLanguage as Lang) ?? "en";
  const scan = (r.freeScanJson ?? {}) as ScanJson;
  const additionalUrls = (r.additionalUrlsJson as string[] | null) ?? [];
  const socialUrls = (r.socialProfileUrlsJson as string[] | null) ?? [];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";

  const offerPreview = offerEmail(lang, {
    name: r.name ?? "",
    websiteUrl: r.websiteUrl,
    packageSummary: packageSummary(lang, r.socialProfileAddon, r.competitorAddon),
    totalPrice: r.totalPrice,
    manualPaymentInstructions: paymentInstructions,
  });

  const Btn = ({ action, label, style = "border" }: { action: () => Promise<void>; label: string; style?: "border" | "primary" | "danger" }) => (
    <form action={action}>
      <button
        type="submit"
        className={
          style === "primary"
            ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            : style === "danger"
              ? "rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
              : "rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary"
        }
      >
        {label}
      </button>
    </form>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title={r.normalizedDomain}>
        <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-primary">{r.reportStatus.replace(/_/g, " ")}</span>
      </PageHeader>
      <Link href="/administracija/llm-reports" className="text-sm text-muted hover:text-primary">← All requests</Link>

      {!emailReady && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          Email sending is not configured. Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel to send offer/report emails. Actions still update status; emails are skipped until then.
        </div>
      )}

      {/* Client + request details */}
      <FormSection title="Request details">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Website"><a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{r.websiteUrl}</a></Row>
          <Row k="Email">{r.email}</Row>
          <Row k="Name">{r.name ?? "—"}</Row>
          <Row k="Company">{r.companyName ?? "—"}</Row>
          <Row k="Report language">{r.preferredLanguage.toUpperCase()}</Row>
          <Row k="Page selection">{r.pageSelectionMethod ?? "—"}</Row>
          <Row k="Permission confirmed">{r.permissionConfirmed ? `Yes — ${r.permissionConfirmedAt?.toISOString().slice(0, 16).replace("T", " ")}${r.permissionIp ? ` (${r.permissionIp})` : ""}` : "No"}</Row>
          <Row k="Created">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Row>
        </dl>
        {additionalUrls.length > 0 && <div className="mt-3 text-sm"><span className="text-muted">Additional URLs:</span> {additionalUrls.join(", ")}</div>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {r.socialProfileAddon && <span className="rounded-full bg-soft px-2 py-0.5 text-primary">+ Social profiles</span>}
          {r.competitorAddon && <span className="rounded-full bg-soft px-2 py-0.5 text-primary">+ Competitor: {r.competitorUrl}</span>}
        </div>
        {socialUrls.length > 0 && <div className="mt-2 text-xs text-muted">Profiles: {socialUrls.join(", ")}</div>}
      </FormSection>

      {/* Free scan result */}
      {scan.scores && (
        <FormSection title={`Free scan · overall ${r.freeScanScore ?? "—"}/100`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(scan.scores).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-background p-2 text-center">
                <div className="text-lg font-bold">{v}</div>
                <div className="text-[10px] text-muted">{k}</div>
              </div>
            ))}
          </div>
          {scan.topIssues && scan.topIssues.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {scan.topIssues.map((i) => <li key={i.id}>• <span className="capitalize">{i.priority}</span> — {i.text}</li>)}
            </ul>
          )}
        </FormSection>
      )}

      {/* Pricing + payment settings */}
      <form action={saveReportSettings.bind(null, r.id)}>
        <FormSection title="Pricing & payment">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total price (€)"><Input name="totalPrice" type="number" defaultValue={r.totalPrice} /></Field>
            <Field label="Payment status"><Input value={r.paymentStatus} disabled readOnly /></Field>
          </div>
          <Field label="Manual payment instructions (shared setting)"><Textarea name="paymentInstructions" rows={3} defaultValue={paymentInstructions} /></Field>
          <Field label="Admin notes"><Textarea name="adminNotes" rows={2} defaultValue={r.adminNotes ?? ""} /></Field>
          <SubmitButton label="Save" />
        </FormSection>
      </form>

      {/* Offer email preview */}
      <FormSection title="Offer email preview">
        <div className="rounded-lg border border-border bg-background p-3 text-xs">
          <div className="font-semibold">{offerPreview.subject}</div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-muted">{offerPreview.text}</pre>
        </div>
      </FormSection>

      {/* Report links */}
      {r.privateReportToken && (
        <FormSection title="Report links">
          <div className="space-y-2 text-sm">
            <div><span className="text-muted">Private:</span> <a className="text-primary hover:underline" href={`${site}/${lang}/report/private/${r.privateReportToken}`} target="_blank" rel="noopener">{`/${lang}/report/private/${r.privateReportToken.slice(0, 12)}…`}</a></div>
            {r.publicShareSlug && (
              <div className="flex items-center gap-2">
                <span className="text-muted">Public share:</span>
                <a className="text-primary hover:underline" href={`${site}/${lang}/report/share/${r.publicShareSlug}`} target="_blank" rel="noopener">{`/${lang}/report/share/${r.publicShareSlug}`}</a>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.publicShareEnabled ? "bg-green-500/10 text-green-600" : "bg-gray-400/10 text-gray-500"}`}>{r.publicShareEnabled ? "enabled" : "disabled"}</span>
                <Btn action={togglePublicShare.bind(null, r.id)} label={r.publicShareEnabled ? "Disable" : "Enable"} />
              </div>
            )}
          </div>
        </FormSection>
      )}

      {/* Actions */}
      <FormSection title="Actions">
        <div className="flex flex-wrap gap-2">
          <Btn action={approveAndSendOffer.bind(null, r.id)} label="Approve & Send Offer" style="primary" />
          <Btn action={markPaid.bind(null, r.id)} label="Mark as Paid" />
          <Btn action={generateReport.bind(null, r.id)} label="Generate Report" />
          <Btn action={approveAndSendReport.bind(null, r.id)} label="Approve & Send Report" style="primary" />
          <Btn action={archiveRequest.bind(null, r.id)} label="Archive" />
          <Btn action={rejectRequest.bind(null, r.id)} label="Reject" style="danger" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Recommended flow: review → <strong>Approve &amp; Send Offer</strong> → <strong>Mark as Paid</strong> → <strong>Generate Report</strong> → <strong>Approve &amp; Send Report</strong>. The report is never sent to the client before you approve it.
        </p>
      </FormSection>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
