import type { Author } from "@/generated/prisma/client";
import { Field, Input, Textarea, Select, Checkbox, SubmitButton, FormSection } from "@/components/admin/ui";
import { AuthorPhotoUpload } from "@/components/admin/author-photo-upload";

/** Brief-provided defaults so a fresh author starts as the Varel founder byline. */
const D = {
  internalName: "Matija Pinko",
  displayNameEn: "Matt Pinko",
  displayNameHr: "Matija Pinko",
  slugEn: "matt-pinko",
  slugHr: "matija-pinko",
  roleEn: "Founder & Editor at Varel",
  roleHr: "Osnivač i urednik Varela",
  email: "matija@pinko.hr",
  expertiseEn: "AI tools\nSEO\nLLM search\nContent strategy\nAffiliate publishing\nAutomation\nDigital products\nAI workflows\nWebsite optimization\nBusiness tools",
  expertiseHr: "AI alati\nSEO\nLLM search\nContent strategija\nAffiliate publishing\nAutomatizacija\nDigitalni proizvodi\nAI workflowi\nOptimizacija web stranica\nPoslovni alati",
};

function tagsText(v: unknown): string {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").join("\n") : "";
}

export function AuthorForm({
  author,
  action,
}: {
  author?: Author | null;
  action: (form: FormData) => Promise<void>;
}) {
  const isNew = !author;
  const photoMissing = !author?.photoUrl;

  return (
    <form action={action} className="max-w-2xl space-y-6">
      {photoMissing && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          Author photo is missing. Upload your photo below — it will be used in the author box and on the About Us page.
          <br />
          <span className="text-amber-600/90">Nedostaje autorska fotografija. Uploadaj svoju fotografiju — koristit će se u author boxu i na About Us stranici.</span>
        </div>
      )}

      <FormSection title="Internal identity">
        <Field label="Internal name" hint="Used only in the admin.">
          <Input name="internalName" required defaultValue={author?.internalName ?? (isNew ? D.internalName : "")} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Checkbox name="isActive" label="Active" defaultChecked={author?.isActive ?? true} />
          <Checkbox name="isDefault" label="Default author (fallback for posts)" defaultChecked={author?.isDefault ?? isNew} />
        </div>
        <Field label="Default language">
          <Select name="defaultLanguage" defaultValue={author?.defaultLanguage ?? "hr"}>
            <option value="hr">Croatian</option>
            <option value="en">English</option>
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Photos">
        <AuthorPhotoUpload name="photoUrl" label="Author photo (used in author box, compact meta, profile & About)" initialUrl={author?.photoUrl} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Photo alt text (EN)"><Input name="photoAltEn" defaultValue={author?.photoAltEn ?? ""} placeholder="Photo of Matt Pinko, founder and editor at Varel" /></Field>
          <Field label="Photo alt text (HR)"><Input name="photoAltHr" defaultValue={author?.photoAltHr ?? ""} placeholder="Fotografija Matije Pinka, osnivača i urednika Varela" /></Field>
        </div>
        <div className="mt-2 border-t border-border pt-4">
          <AuthorPhotoUpload name="aboutPhotoUrl" label="Separate About Us photo (optional — defaults to the author photo)" initialUrl={author?.aboutPhotoUrl} />
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field label="About photo alt (EN)"><Input name="aboutPhotoAltEn" defaultValue={author?.aboutPhotoAltEn ?? ""} /></Field>
            <Field label="About photo alt (HR)"><Input name="aboutPhotoAltHr" defaultValue={author?.aboutPhotoAltHr ?? ""} /></Field>
          </div>
        </div>
      </FormSection>

      <FormSection title="English public identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name (EN)"><Input name="displayNameEn" defaultValue={author?.displayNameEn ?? (isNew ? D.displayNameEn : "")} /></Field>
          <Field label="Slug (EN)" hint="matt-pinko → /en/authors/matt-pinko"><Input name="slugEn" defaultValue={author?.slugEn ?? (isNew ? D.slugEn : "")} /></Field>
        </div>
        <Field label="Role (EN)"><Input name="roleEn" defaultValue={author?.roleEn ?? (isNew ? D.roleEn : "")} /></Field>
        <Field label="Short bio (EN)"><Textarea name="bioShortEn" rows={3} defaultValue={author?.bioShortEn ?? ""} /></Field>
        <Field label="Long bio (EN)"><Textarea name="bioLongEn" rows={6} defaultValue={author?.bioLongEn ?? ""} /></Field>
        <Field label="Expertise tags (EN)" hint="One per line (or comma-separated)."><Textarea name="expertiseTagsEn" rows={5} defaultValue={author ? tagsText(author.expertiseTagsEnJson) : D.expertiseEn} /></Field>
      </FormSection>

      <FormSection title="Croatian public identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name (HR)"><Input name="displayNameHr" defaultValue={author?.displayNameHr ?? (isNew ? D.displayNameHr : "")} /></Field>
          <Field label="Slug (HR)" hint="matija-pinko → /hr/autori/matija-pinko"><Input name="slugHr" defaultValue={author?.slugHr ?? (isNew ? D.slugHr : "")} /></Field>
        </div>
        <Field label="Role (HR)"><Input name="roleHr" defaultValue={author?.roleHr ?? (isNew ? D.roleHr : "")} /></Field>
        <Field label="Short bio (HR)"><Textarea name="bioShortHr" rows={3} defaultValue={author?.bioShortHr ?? ""} /></Field>
        <Field label="Long bio (HR)"><Textarea name="bioLongHr" rows={6} defaultValue={author?.bioLongHr ?? ""} /></Field>
        <Field label="Expertise tags (HR)" hint="One per line (or comma-separated)."><Textarea name="expertiseTagsHr" rows={5} defaultValue={author ? tagsText(author.expertiseTagsHrJson) : D.expertiseHr} /></Field>
      </FormSection>

      <FormSection title="Contact & social links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input name="email" type="email" defaultValue={author?.email ?? (isNew ? D.email : "")} /></Field>
          <Field label="Website"><Input name="websiteUrl" defaultValue={author?.websiteUrl ?? ""} /></Field>
          <Field label="LinkedIn"><Input name="linkedinUrl" defaultValue={author?.linkedinUrl ?? ""} /></Field>
          <Field label="X (Twitter)"><Input name="xUrl" defaultValue={author?.xUrl ?? ""} /></Field>
          <Field label="Instagram"><Input name="instagramUrl" defaultValue={author?.instagramUrl ?? ""} /></Field>
          <Field label="YouTube"><Input name="youtubeUrl" defaultValue={author?.youtubeUrl ?? ""} /></Field>
          <Field label="GitHub"><Input name="githubUrl" defaultValue={author?.githubUrl ?? ""} /></Field>
        </div>
      </FormSection>

      <SubmitButton label={isNew ? "Create author" : "Save author"} />
    </form>
  );
}
