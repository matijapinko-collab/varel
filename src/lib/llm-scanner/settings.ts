import { getSetting } from "@/lib/settings";

/** Admin-configurable LLM scanner / rendering settings (stored in `settings`). */
export type LlmScannerSettings = {
  playwrightEnabled: boolean;
  screenshotsEnabled: boolean;
  visualAnalysisEnabled: boolean;
  freeScanRenderEnabled: boolean;
  paidScanRenderEnabled: boolean;
  renderTimeoutFreeMs: number;
  renderTimeoutPaidMs: number;
  maxConcurrentRenders: number;
  screenshotStorageProvider: "local" | "object_storage" | "disabled";
  scannerUserAgent: string;
};

export const DEFAULT_SCANNER_SETTINGS: LlmScannerSettings = {
  playwrightEnabled: true,
  screenshotsEnabled: true,
  visualAnalysisEnabled: true,
  freeScanRenderEnabled: true,
  paidScanRenderEnabled: true,
  renderTimeoutFreeMs: 20_000,
  renderTimeoutPaidMs: 30_000,
  maxConcurrentRenders: 1,
  screenshotStorageProvider: "object_storage",
  scannerUserAgent: "Mozilla/5.0 (compatible; VarelLLMScanner/1.0; +https://varel.io)",
};

export const LLM_SCANNER_SETTINGS_KEY = "llm_scanner";

export async function getLlmScannerSettings(): Promise<LlmScannerSettings> {
  const stored = await getSetting<Partial<LlmScannerSettings>>(LLM_SCANNER_SETTINGS_KEY).catch(() => null);
  const s = { ...DEFAULT_SCANNER_SETTINGS, ...(stored ?? {}) };
  s.renderTimeoutFreeMs = Math.min(30_000, Math.max(5_000, s.renderTimeoutFreeMs || 20_000));
  s.renderTimeoutPaidMs = Math.min(45_000, Math.max(5_000, s.renderTimeoutPaidMs || 30_000));
  s.maxConcurrentRenders = Math.min(3, Math.max(1, s.maxConcurrentRenders || 1));
  return s;
}
