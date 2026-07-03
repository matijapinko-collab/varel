/**
 * Cookie consent model (client-side). Consent is stored in a first-party cookie
 * and drives whether optional technologies (analytics, marketing) may load.
 * Default is opt-in: nothing optional runs until the visitor allows it — which
 * satisfies EU/EEA/UK "no analytics before consent" requirements globally.
 */
export const CONSENT_COOKIE = "varel-consent";
export const CONSENT_VERSION = 1;
export const CONSENT_CHANGE_EVENT = "varel:consent-change";
export const OPEN_PREFERENCES_EVENT = "varel:open-cookie-preferences";

export type ConsentCategory = "necessary" | "analytics" | "functional" | "marketing";

export type ConsentCategories = {
  necessary: true; // always on
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

export type ConsentState = {
  v: number;
  categories: ConsentCategories;
  ts: number;
};

export const DENY_ALL: ConsentCategories = {
  necessary: true,
  analytics: false,
  functional: false,
  marketing: false,
};

export const GRANT_ALL: ConsentCategories = {
  necessary: true,
  analytics: true,
  functional: true,
  marketing: true,
};

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)varel-consent=([^;]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as ConsentState;
    if (parsed?.v === CONSENT_VERSION && parsed.categories) return parsed;
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

export function writeConsent(categories: ConsentCategories): ConsentState {
  const state: ConsentState = { v: CONSENT_VERSION, categories, ts: Date.now() };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(state)
  )};path=/;max-age=${60 * 60 * 24 * 180};samesite=lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: state }));
  return state;
}

/** Browser-level opt-out signals (Global Privacy Control / Do Not Track). */
export function hasGlobalPrivacySignal(): boolean {
  if (typeof navigator === "undefined") return false;
  const gpc = (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const dnt =
    navigator.doNotTrack === "1" ||
    (typeof window !== "undefined" &&
      (window as unknown as { doNotTrack?: string }).doNotTrack === "1");
  return gpc || dnt;
}
