/**
 * Inline theme bootstrap for the public site.
 *
 * The root layout used to read the theme cookie with cookies(), which forces
 * every public route into dynamic rendering — one call opted the whole site
 * out of the Full Route Cache. Instead the server now renders the
 * branding-default theme (identical HTML for every visitor, so it is
 * cacheable), and this script — inlined as the first element of <body>, so it
 * executes before anything paints — corrects the class from the client-readable
 * `varel-theme` cookie when the visitor chose differently.
 *
 * Safety: the only interpolated value is the default theme, forced through a
 * two-value allowlist here, and the cookie value is matched against the same
 * allowlist inside the script. No user-controlled content enters the markup.
 */

// Must match THEME_COOKIE in i18n/config.ts and the theme-toggle component.
// Declared locally so this module stays importable from plain node tests.
const THEME_COOKIE = "varel-theme";

export type PublicTheme = "light" | "dark";

export function themeInitScript(defaultTheme: string | null | undefined): string {
  const fallback: PublicTheme = defaultTheme === "dark" ? "dark" : "light";
  // Single line, no user input. `d` is the allowlisted default.
  return (
    `(function(){var d="${fallback}";` +
    `var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)(?:;|$)/);` +
    `var t=m?m[1]:d;` +
    `document.documentElement.classList.toggle("dark",t==="dark");` +
    `document.documentElement.style.colorScheme=t;})();`
  );
}
