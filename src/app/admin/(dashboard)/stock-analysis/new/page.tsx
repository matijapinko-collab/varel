import { createStockAnalysis } from "@/server/actions/finance";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewStockAnalysisPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New stock analysis" />
      <form action={createStockAnalysis}>
        <FormSection title="Create analysis">
          <Field label="Company name"><Input name="companyName" required placeholder="e.g. Apple Inc." /></Field>
          <Field label="Ticker"><Input name="ticker" required placeholder="e.g. AAPL" /></Field>
          <Field label="Slug" hint="Leave empty to generate">
            <Input name="slug" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
