import { db } from "@/lib/db";
import { PageHeader, AdminTable, Field, Input, SubmitButton, FormSection, Checkbox } from "@/components/admin/ui";
import { saveLanguage, addLanguage } from "@/server/actions/system";

export default async function AdminLanguagesPage() {
  const languages = await db.language.findMany({ orderBy: { position: "asc" } });

  return (
    <div>
      <PageHeader title="Languages" />
      <AdminTable headers={["Language", "Code", "Enabled", "Default", ""]} empty={languages.length === 0}>
        {languages.map((lang) => (
          <tr key={lang.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3 font-medium">
              {lang.nativeName} <span className="text-xs text-muted">({lang.name})</span>
            </td>
            <td className="px-4 py-3 text-xs uppercase text-muted">{lang.code}</td>
            <td className="px-4 py-3 text-xs">{lang.isEnabled ? "✓" : "—"}</td>
            <td className="px-4 py-3 text-xs">{lang.isDefault ? "★" : "—"}</td>
            <td className="px-4 py-3">
              <form action={saveLanguage.bind(null, lang.id)} className="flex items-center gap-4">
                <Checkbox name="isEnabled" label="Enabled" defaultChecked={lang.isEnabled} />
                <Checkbox name="isDefault" label="Default" defaultChecked={lang.isDefault} />
                <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary">
                  Save
                </button>
              </form>
            </td>
          </tr>
        ))}
      </AdminTable>

      <form action={addLanguage} className="mt-8 max-w-xl">
        <FormSection title="Add language">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Code" hint="ISO 639-1, e.g. pt">
              <Input name="code" required maxLength={5} />
            </Field>
            <Field label="English name">
              <Input name="name" required />
            </Field>
            <Field label="Native name">
              <Input name="nativeName" />
            </Field>
          </div>
          <p className="text-xs text-muted">
            Note: full URL routing support for a brand-new language also requires adding its
            code to <code>SUPPORTED_LOCALES</code> (a one-line change Claude can make).
            The 8 planned languages (en, hr, de, fr, it, es, zh, hi) are already routable.
          </p>
          <SubmitButton label="Add language" />
        </FormSection>
      </form>
    </div>
  );
}
