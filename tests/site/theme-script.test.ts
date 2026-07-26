import { test } from "node:test";
import assert from "node:assert/strict";
import { themeInitScript } from "../../src/lib/theme-script.ts";

/**
 * The inline theme bootstrap replaced the server-side cookies() read that
 * forced every public route into dynamic rendering. These tests pin its two
 * safety properties: the default is allowlisted (no injection through
 * branding), and the cookie is only honoured for the exact values the theme
 * toggle writes.
 */

test("default theme is allowlisted to light/dark", () => {
  assert.ok(themeInitScript("dark").includes('var d="dark"'));
  assert.ok(themeInitScript("light").includes('var d="light"'));
  // Anything unexpected — null, empty, or a hostile branding value — falls
  // back to light and never reaches the markup verbatim.
  for (const hostile of [null, undefined, "", "DARK", '";alert(1);"', "<script>"]) {
    const js = themeInitScript(hostile as string | null);
    assert.ok(js.includes('var d="light"'), `fallback for ${String(hostile)}`);
    assert.ok(!js.includes("alert"), "hostile input must not survive");
    assert.ok(!js.includes("<"), "no markup characters in the script");
  }
});

test("cookie regex accepts only dark|light for the varel-theme cookie", () => {
  const js = themeInitScript("light");
  assert.ok(js.includes("varel-theme=(dark|light)"));
});

test("script toggles the class and color-scheme, nothing else", () => {
  const js = themeInitScript("dark");
  assert.ok(js.includes('classList.toggle("dark"'));
  assert.ok(js.includes("colorScheme=t"));
  assert.ok(!js.includes("innerHTML"), "script must not write markup");
});
