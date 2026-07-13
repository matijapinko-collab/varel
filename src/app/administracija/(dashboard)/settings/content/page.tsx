import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Field, Select, Checkbox, SubmitButton, FormSection } from "@/components/admin/ui";
import { getContentSettings } from "@/lib/authors";
import { saveContentSettings } from "@/server/actions/settings";

export const dynamic = "force-dynamic";

export default async function ContentSettingsPage() {
  const [settings, authors] = await Promise.all([
    getContentSettings(),
    db.author.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { internalName: "asc" }], select: { id: true, internalName: true, displayNameEn: true, photoUrl: true, isDefault: true } }).catch(() => []),
  ]);

  const defaultAuthor = authors.find((a) => a.isDefault) ?? authors.find((a) => a.id === settings.defaultAuthorId);
  const photoMissing = defaultAuthor && !defaultAuthor.photoUrl;
  const noAuthors = authors.length === 0;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Content & Authors" />
      <Link href="/administracija/authors" className="text-sm text-muted hover:text-primary">Manage authors →</Link>

      {noAuthors ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          No author exists yet. <Link href="/administracija/authors/new" className="font-semibold underline">Create the default author</Link> (Matija Pinko / Matt Pinko) to enable author boxes.
        </div>
      ) : photoMissing ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          Author photo is missing. Upload your photo in the <Link href={`/administracija/authors/${defaultAuthor?.id}/edit`} className="font-semibold underline">author panel</Link>. It will be used in the author box and on the About Us page.
          <br />
          <span className="text-amber-600/90">Nedostaje autorska fotografija. Uploadaj svoju fotografiju u adminu. Koristit će se u author boxu i na About Us stranici.</span>
        </div>
      ) : null}

      <form action={saveContentSettings} className="mt-4 space-y-6">
        <FormSection title="Author display">
          <Checkbox name="authorBoxOnArticles" label="Show author box on articles & guides" defaultChecked={settings.authorBoxOnArticles} />
          <Checkbox name="authorBoxOnReviews" label="Show author box on AI tool reviews" defaultChecked={settings.authorBoxOnReviews} />
          <Checkbox name="authorBoxOnComparisons" label="Show author box on comparisons" defaultChecked={settings.authorBoxOnComparisons} />
          <Checkbox name="compactAuthorUnderTitle" label="Show compact author byline under the title" defaultChecked={settings.compactAuthorUnderTitle} />
        </FormSection>

        <FormSection title="Publishing">
          <Checkbox name="requireAuthorBeforePublishing" label="Require an author before publishing (falls back to default author)" defaultChecked={settings.requireAuthorBeforePublishing} />
          <Field label="Default author" hint="Used when a post has no author selected, and on reviews / comparisons / About.">
            <Select name="defaultAuthorId" defaultValue={settings.defaultAuthorId ?? defaultAuthor?.id ?? ""}>
              <option value="">— none —</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.displayNameEn} ({a.internalName})</option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <SubmitButton label="Save content settings" />
      </form>
    </div>
  );
}
