import Link from "next/link";
import { PageHeader, FormSection, Field, Input, Select, Checkbox, SubmitButton } from "@/components/admin/ui";
import { getLlmScannerSettings } from "@/lib/llm-scanner/settings";
import { isRendererAvailable } from "@/lib/llm-scanner/renderer";
import { saveLlmScannerSettings } from "@/server/actions/llm-reports";

export const dynamic = "force-dynamic";

export default async function LlmScannerSettingsPage() {
  const [s, rendererReady] = await Promise.all([getLlmScannerSettings(), isRendererAvailable()]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="LLM Scanner & Rendering" />
      <Link href="/administracija/llm-reports" className="text-sm text-muted hover:text-primary">← LLM Reports</Link>

      <div className={`mt-4 rounded-lg border p-3 text-sm ${rendererReady ? "border-green-500/30 bg-green-500/5 text-green-700" : "border-amber-500/30 bg-amber-500/5 text-amber-700"}`}>
        <span className="font-semibold">Headless browser: {rendererReady ? "available" : "not available"}.</span>{" "}
        {rendererReady
          ? "Rendered-DOM analysis and screenshots will run."
          : "Rendering is skipped and reports use static-HTML analysis only. To enable, set CHROME_EXECUTABLE_PATH (or add @sparticuz/chromium on serverless / run the scanner worker)."}
      </div>

      <form action={saveLlmScannerSettings} className="mt-4 space-y-6">
        <FormSection title="Rendering">
          <Checkbox name="playwrightEnabled" label="Enable Playwright rendered-DOM analysis" defaultChecked={s.playwrightEnabled} />
          <Checkbox name="paidScanRenderEnabled" label="Render pages for paid detailed reports" defaultChecked={s.paidScanRenderEnabled} />
          <Checkbox name="freeScanRenderEnabled" label="Render homepage for the free scan (simplified signal)" defaultChecked={s.freeScanRenderEnabled} />
          <Checkbox name="screenshotsEnabled" label="Capture screenshots (paid reports)" defaultChecked={s.screenshotsEnabled} />
          <Checkbox name="visualAnalysisEnabled" label="Analyze computed styles / colors / contrast" defaultChecked={s.visualAnalysisEnabled} />
        </FormSection>

        <FormSection title="Limits">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Free render timeout (ms)"><Input name="renderTimeoutFreeMs" type="number" defaultValue={s.renderTimeoutFreeMs} /></Field>
            <Field label="Paid render timeout (ms)"><Input name="renderTimeoutPaidMs" type="number" defaultValue={s.renderTimeoutPaidMs} /></Field>
            <Field label="Max concurrent renders"><Input name="maxConcurrentRenders" type="number" min={1} max={3} defaultValue={s.maxConcurrentRenders} /></Field>
          </div>
        </FormSection>

        <FormSection title="Storage & identity">
          <Field label="Screenshot storage">
            <Select name="screenshotStorageProvider" defaultValue={s.screenshotStorageProvider}>
              <option value="object_storage">Object storage (Vercel Blob / R2)</option>
              <option value="local">Local (development)</option>
              <option value="disabled">Disabled</option>
            </Select>
          </Field>
          <Field label="Scanner user agent" hint="Use Varel's own UA — do not impersonate other crawlers.">
            <Input name="scannerUserAgent" defaultValue={s.scannerUserAgent} />
          </Field>
        </FormSection>

        <SubmitButton label="Save scanner settings" />
      </form>
    </div>
  );
}
