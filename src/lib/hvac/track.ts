"use client";

/**
 * Thin wrapper over the site's existing GA (gtag). Fires a named event with
 * non-personal parameters only. Fails silently if GA isn't loaded (e.g. no
 * analytics consent) — never throws, never blocks the UI.
 */
type GtagParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: GtagParams) => void;
    dataLayer?: unknown[];
  }
}

export function hvacTrack(event: string, params?: GtagParams): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, params);
    }
  } catch {
    /* analytics must never break the page */
  }
}
