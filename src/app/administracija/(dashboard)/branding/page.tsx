/* eslint-disable @next/next/no-img-element */
import { db } from "@/lib/db";
import { getBranding } from "@/lib/settings";
import {
  PageHeader,
  Field,
  Input,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
} from "@/components/admin/ui";
import { saveBranding } from "@/server/actions/settings";

export default async function AdminBrandingPage() {
  const [branding, media] = await Promise.all([
    getBranding(),
    db.media.findMany({
      where: { deletedAt: null, mimeType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const mediaSelect = (name: string, current: string | null) => (
    <Select name={name} defaultValue={current ?? ""}>
      <option value="">— none —</option>
      {media.map((m) => (
        <option key={m.id} value={m.id}>
          {m.title ?? m.filename}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="max-w-2xl">
      <PageHeader title="Branding" />

      {branding.lightLogoUrl && (
        <div className="mb-6 flex items-center gap-6 rounded-card border border-border bg-card p-5">
          <img src={branding.lightLogoUrl} alt="Current logo" className="h-12 w-auto rounded" />
          <p className="text-sm text-muted">
            Current logo. Upload a new file in the <strong>Media Library</strong>, then pick
            it below — it updates across the whole site instantly.
          </p>
        </div>
      )}

      <form action={saveBranding} className="space-y-6">
        <FormSection title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site name">
              <Input name="siteName" defaultValue={branding.siteName} />
            </Field>
            <Field label="Tagline">
              <Input name="tagline" defaultValue={branding.tagline ?? ""} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Logos & images (pick from Media Library)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Light theme logo">{mediaSelect("lightLogoId", branding.lightLogoId)}</Field>
            <Field label="Dark theme logo">{mediaSelect("darkLogoId", branding.darkLogoId)}</Field>
            <Field label="Favicon">{mediaSelect("faviconId", branding.faviconId)}</Field>
            <Field label="App icon">{mediaSelect("appIconId", branding.appIconId)}</Field>
            <Field label="Default social sharing image (OG)">
              {mediaSelect("defaultOgImageId", branding.defaultOgImageId)}
            </Field>
          </div>
        </FormSection>

        <FormSection title="Theme">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary color">
              <Input name="primaryColor" type="color" defaultValue={branding.primaryColor} className="h-11 w-24 p-1" />
            </Field>
            <Field label="Accent color">
              <Input name="accentColor" type="color" defaultValue={branding.accentColor} className="h-11 w-24 p-1" />
            </Field>
            <Field label="Default theme">
              <Select name="defaultTheme" defaultValue={branding.defaultTheme}>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">System</option>
              </Select>
            </Field>
            <Field label="Border radius" hint="e.g. 0.75rem">
              <Input name="borderRadius" defaultValue={branding.borderRadius} />
            </Field>
            <Field label="Font family">
              <Input name="fontFamily" defaultValue={branding.fontFamily} />
            </Field>
            <Field label="Button style">
              <Select name="buttonStyle" defaultValue={branding.buttonStyle}>
                <option value="rounded">Rounded (pill)</option>
                <option value="soft">Soft corners</option>
                <option value="square">Square</option>
              </Select>
            </Field>
          </div>
          <Checkbox
            name="enableThemeToggle"
            label="Show light/dark toggle to visitors"
            defaultChecked={branding.enableThemeToggle}
          />
        </FormSection>

        <SubmitButton label="Save branding" />
      </form>
    </div>
  );
}
