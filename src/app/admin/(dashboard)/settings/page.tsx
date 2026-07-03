import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { PageHeader, Field, Input, Select, Checkbox, SubmitButton, FormSection } from "@/components/admin/ui";
import { saveGeneralSettings } from "@/server/actions/settings";

export default async function AdminSettingsPage() {
  const [siteName, cookieBanner, defaultLanguage, languages] = await Promise.all([
    getSetting<string>("site_name"),
    getSetting<boolean>("cookie_banner_enabled"),
    getSetting<string>("default_language"),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" />
      <form action={saveGeneralSettings}>
        <FormSection title="General">
          <Field label="Site name">
            <Input name="site_name" defaultValue={siteName ?? "Varel"} />
          </Field>
          <Field label="Default public language">
            <Select name="default_language" defaultValue={defaultLanguage ?? "en"}>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeName}</option>
              ))}
            </Select>
          </Field>
          <Checkbox
            name="cookie_banner_enabled"
            label="Show cookie banner"
            defaultChecked={cookieBanner ?? true}
          />
          <SubmitButton label="Save settings" />
        </FormSection>
      </form>
      <p className="mt-6 text-sm text-muted">
        Analytics IDs are configured under <strong>Analytics</strong>; logo, colors and
        theme under <strong>Branding</strong>; navigation under <strong>Menus</strong>.
      </p>
    </div>
  );
}
