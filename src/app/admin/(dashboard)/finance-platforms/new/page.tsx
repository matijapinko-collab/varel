import { createFinancePlatform } from "@/server/actions/finance";
import { PageHeader, Field, Input, Select, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewFinancePlatformPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New finance platform review" />
      <form action={createFinancePlatform}>
        <FormSection title="Create review">
          <Field label="Name">
            <Input name="name" required placeholder="e.g. Interactive Brokers" />
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="INVESTING_APP">
              <option value="BROKER">Broker</option>
              <option value="TRADING_PLATFORM">Trading platform</option>
              <option value="INVESTING_APP">Investing app</option>
              <option value="PORTFOLIO_TOOL">Portfolio tool</option>
              <option value="PERSONAL_FINANCE_APP">Personal finance app</option>
              <option value="OTHER">Other financial tool</option>
            </Select>
          </Field>
          <Field label="Slug" hint="Leave empty to generate">
            <Input name="slug" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
