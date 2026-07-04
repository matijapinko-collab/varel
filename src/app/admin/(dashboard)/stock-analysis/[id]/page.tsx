import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveStockAnalysis } from "@/server/actions/finance";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
  StatusBadge,
} from "@/components/admin/ui";
import { SeoFields } from "@/components/admin/seo-fields";
import { strList } from "@/lib/finance-data";

export default async function EditStockAnalysisPage(
  props: PageProps<"/admin/stock-analysis/[id]">
) {
  const { id } = await props.params;
  const [analysis, defaultLang] = await Promise.all([
    db.stockAnalysis.findUnique({ where: { id } }),
    db.language.findFirst({ where: { isDefault: true } }),
  ]);
  if (!analysis || !defaultLang) notFound();

  const metricsText = Array.isArray(analysis.keyMetricsJson)
    ? (analysis.keyMetricsJson as { label: string; value: string }[])
        .map((m) => `${m.label} | ${m.value}`)
        .join("\n")
    : "";
  const faqText = Array.isArray(analysis.faqJson)
    ? (analysis.faqJson as { question: string; answer: string }[])
        .map((f) => `${f.question} | ${f.answer}`)
        .join("\n")
    : "";

  return (
    <div>
      <PageHeader title={`Analysis: ${analysis.companyName} (${analysis.ticker})`}>
        <StatusBadge status={analysis.status} />
        <Link
          href={`/en/finance/stock-analysis/${analysis.slug}`}
          target="_blank"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Preview ↗
        </Link>
      </PageHeader>

      <form action={saveStockAnalysis.bind(null, analysis.id)} className="space-y-6">
        <FormSection title="Company">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Company name"><Input name="companyName" defaultValue={analysis.companyName} required /></Field>
            <Field label="Ticker"><Input name="ticker" defaultValue={analysis.ticker} required /></Field>
            <Field label="Slug"><Input name="slug" defaultValue={analysis.slug} /></Field>
            <Field label="Exchange"><Input name="exchange" defaultValue={analysis.exchange ?? ""} /></Field>
            <Field label="Sector"><Input name="sector" defaultValue={analysis.sector ?? ""} /></Field>
            <Field label="Industry"><Input name="industry" defaultValue={analysis.industry ?? ""} /></Field>
            <Field label="Country"><Input name="country" defaultValue={analysis.country ?? ""} /></Field>
          </div>
        </FormSection>

        <FormSection title="Classification">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Investment idea type">
              <Select name="investmentIdeaType" defaultValue={analysis.investmentIdeaType}>
                <option value="LONG_TERM_WATCHLIST">Long-term watchlist</option>
                <option value="GROWTH_STOCK">Growth stock</option>
                <option value="DIVIDEND_STOCK">Dividend stock</option>
                <option value="VALUE_STOCK">Value stock</option>
                <option value="TURNAROUND_IDEA">Turnaround idea</option>
                <option value="SPECULATIVE_IDEA">Speculative idea</option>
                <option value="DEFENSIVE_STOCK">Defensive stock</option>
                <option value="ETF_ALTERNATIVE">ETF alternative</option>
                <option value="AVOID_WATCH_CAREFULLY">Avoid / watch carefully</option>
              </Select>
            </Field>
            <Field label="Risk level">
              <Select name="riskLevel" defaultValue={analysis.riskLevel}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="VERY_HIGH">Very high</option>
                <option value="SPECULATIVE">Speculative</option>
              </Select>
            </Field>
            <Field label="Time horizon">
              <Select name="timeHorizon" defaultValue={analysis.timeHorizon}>
                <option value="SHORT_TERM">Short-term</option>
                <option value="MEDIUM_TERM">Medium-term</option>
                <option value="LONG_TERM">Long-term</option>
                <option value="WATCHLIST_ONLY">Watchlist only</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={analysis.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox
            name="markReviewed"
            label={`Mark as reviewed today${analysis.lastReviewedAt ? ` (last: ${analysis.lastReviewedAt.toLocaleDateString()})` : ""}`}
          />
        </FormSection>

        <FormSection title="Analysis">
          <Field label="Thesis summary">
            <Textarea name="thesisSummary" defaultValue={analysis.thesisSummary ?? ""} rows={3} />
          </Field>
          <Field label="Key metrics" hint="One per line: Label | Value">
            <Textarea name="keyMetrics" defaultValue={metricsText} rows={4} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bull case" hint="One point per line">
              <Textarea name="bullCase" defaultValue={strList(analysis.bullCaseJson).join("\n")} rows={4} />
            </Field>
            <Field label="Bear case" hint="One point per line">
              <Textarea name="bearCase" defaultValue={strList(analysis.bearCaseJson).join("\n")} rows={4} />
            </Field>
          </div>
          <Field label="Key risks" hint="One per line">
            <Textarea name="keyRisks" defaultValue={strList(analysis.keyRisksJson).join("\n")} rows={3} />
          </Field>
          <Field label="Valuation overview">
            <Textarea name="valuationOverview" defaultValue={analysis.valuationOverview ?? ""} rows={3} />
          </Field>
          <Field label="Growth overview">
            <Textarea name="growthOverview" defaultValue={analysis.growthOverview ?? ""} rows={3} />
          </Field>
          <Field label="Profitability overview">
            <Textarea name="profitabilityOverview" defaultValue={analysis.profitabilityOverview ?? ""} rows={3} />
          </Field>
          <Field label="Debt / balance sheet overview">
            <Textarea name="debtOverview" defaultValue={analysis.debtOverview ?? ""} rows={3} />
          </Field>
          <Field label="Dividend overview (if applicable)">
            <Textarea name="dividendOverview" defaultValue={analysis.dividendOverview ?? ""} rows={2} />
          </Field>
          <Field label="Final editorial view / conclusion">
            <Textarea name="conclusion" defaultValue={analysis.conclusion ?? ""} rows={3} />
          </Field>
          <Field label="Sources" hint="One per line">
            <Textarea name="sources" defaultValue={strList(analysis.sourcesJson).join("\n")} rows={3} />
          </Field>
          <Field label="FAQ" hint="One per line: Question | Answer">
            <Textarea name="faq" defaultValue={faqText} rows={3} />
          </Field>
        </FormSection>

        <SeoFields entityType="STOCK_ANALYSIS" entityId={analysis.id} languageId={defaultLang.id} />
        <SubmitButton label="Save analysis" />
      </form>
    </div>
  );
}
