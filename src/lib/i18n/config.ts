/**
 * Locale configuration. The list of *supported* locales is static (needed by
 * the proxy and static params); which ones are *enabled* is controlled in the
 * admin (languages table). Croatian is the content-creation language;
 * English is the default public language.
 */
export const SUPPORTED_LOCALES = [
  "en",
  "hr",
  "de",
  "fr",
  "it",
  "es",
  "zh",
  "hi",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale =
  (process.env.DEFAULT_LANGUAGE as Locale) ?? "en";

export const LOCALE_COOKIE = "varel-locale";
export const THEME_COOKIE = "varel-theme";

export const LOCALE_LABELS: Record<Locale, { name: string; nativeName: string }> = {
  en: { name: "English", nativeName: "English" },
  hr: { name: "Croatian", nativeName: "Hrvatski" },
  de: { name: "German", nativeName: "Deutsch" },
  fr: { name: "French", nativeName: "Français" },
  it: { name: "Italian", nativeName: "Italiano" },
  es: { name: "Spanish", nativeName: "Español" },
  zh: { name: "Mandarin Chinese", nativeName: "中文" },
  hi: { name: "Hindi", nativeName: "हिन्दी" },
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
