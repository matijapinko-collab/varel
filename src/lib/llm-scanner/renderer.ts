import "server-only";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { assertPublicUrl, normalizeUrl } from "./scan";
import { uploadFile } from "@/lib/storage";

/**
 * Playwright rendered-DOM layer for the LLM Visibility Scanner.
 *
 * DEPLOYMENT NOTE: full Chromium doesn't run in standard Vercel serverless.
 * This module is graceful + pluggable — it resolves a Chromium executable from
 * (1) CHROME_EXECUTABLE_PATH, (2) an optional @sparticuz/chromium package, or
 * (3) a local Playwright install. When none is available it returns
 * renderStatus:"skipped" and the scan continues with static-only analysis.
 * A future scanner-worker just sets CHROME_EXECUTABLE_PATH.
 */

const SCANNER_UA = "Mozilla/5.0 (compatible; VarelLLMScanner/1.0; +https://varel.io)";

export type RenderStatus = "success" | "failed" | "timeout" | "blocked" | "skipped";

export type ComputedElementStyle = {
  selector: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  boxShadow?: string;
};

export type ContrastCheck = {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
};

export type VisualStyleAnalysis = {
  primaryColors: string[];
  bodyBackgroundColor?: string;
  bodyTextColor?: string;
  styles: ComputedElementStyle[];
  fontFamilies: string[];
  fontSizes: string[];
  borderRadii: string[];
  contrastChecks: ContrastCheck[];
  visualConsistencyScore: number;
};

export type RenderedPageAnalysis = {
  renderStatus: RenderStatus;
  renderError?: string;
  renderDurationMs?: number;
  renderedHtmlLength?: number;
  renderedTextLength?: number;
  renderedWordCount?: number;
  renderedTitle?: string | null;
  renderedMetaDescription?: string | null;
  renderedH1?: string | null;
  renderedHeadingCount?: number;
  renderedLinkCount?: number;
  renderedInternalLinkCount?: number;
  renderedImageCount?: number;
  renderedImagesNoAlt?: number;
  renderedButtonCount?: number;
  buttonsWithoutName?: number;
  screenshotUrl?: string;
  visualStyles?: VisualStyleAnalysis;
};

/* ---------------- chromium executable resolution ---------------- */

type Resolved = { executablePath: string; args: string[]; headless: boolean } | null;

async function resolveChromium(): Promise<Resolved> {
  const stdArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"];
  if (process.env.CHROME_EXECUTABLE_PATH && fs.existsSync(process.env.CHROME_EXECUTABLE_PATH)) {
    return { executablePath: process.env.CHROME_EXECUTABLE_PATH, args: stdArgs, headless: true };
  }
  // Optional serverless Chromium (only if the package is installed).
  try {
    const mod = (await import("@sparticuz/chromium" as string).catch(() => null)) as
      | { default?: { executablePath: (p?: string) => Promise<string>; args: string[] } }
      | null;
    const sp = mod?.default;
    if (sp) {
      const exe = await sp.executablePath();
      if (exe) return { executablePath: exe, args: sp.args ?? stdArgs, headless: true };
    }
  } catch { /* not installed */ }
  // Local Playwright cache (dev).
  const local = findLocalChromium();
  if (local) return { executablePath: local, args: stdArgs, headless: true };
  return null;
}

function findLocalChromium(): string | null {
  const roots = [
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ];
  const rel = (arch: string) => [
    // Playwright "chromium-XXXX" builds ship as "Google Chrome for Testing".
    ["chrome-mac" + arch, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    ["chrome-mac" + arch, "Chromium.app", "Contents", "MacOS", "Chromium"],
    // Lighter "chromium_headless_shell-XXXX" builds.
    ["chrome-headless-shell-mac" + arch, "chrome-headless-shell"],
  ];
  const linuxRel = [
    ["chrome-linux", "chrome"],
    ["chrome-linux", "headless_shell"],
    ["chrome-headless-shell-linux64", "chrome-headless-shell"],
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    try {
      // Prefer full "chromium-*" builds, then fall back to headless-shell builds.
      const dirs = fs
        .readdirSync(root)
        .filter((d) => d.startsWith("chromium"))
        .sort((a, b) => (a.includes("headless") ? 1 : 0) - (b.includes("headless") ? 1 : 0));
      for (const dir of dirs) {
        const candidates = [
          ...rel("-arm64").map((p) => path.join(root, dir, ...p)),
          ...rel("").map((p) => path.join(root, dir, ...p)),
          ...linuxRel.map((p) => path.join(root, dir, ...p)),
        ];
        for (const c of candidates) if (fs.existsSync(c)) return c;
      }
    } catch { /* ignore */ }
  }
  return null;
}

export async function isRendererAvailable(): Promise<boolean> {
  return (await resolveChromium()) !== null;
}

/* ---------------- contrast helpers (WCAG, pure) ---------------- */

function parseRgb(s: string): [number, number, number] | null {
  if (!s || !/rgb/i.test(s)) return null;
  const m = s.match(/\d+(?:\.\d+)?/g);
  if (!m || m.length < 3) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(fg: string, bg: string): number | null {
  const a = parseRgb(fg), b = parseRgb(bg);
  if (!a || !b) return null;
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/* ---------------- main render ---------------- */

export type RenderOptions = { timeoutMs?: number; mode?: "full" | "fast"; screenshot?: boolean; requestId?: string; pageKey?: string };

export async function renderPageWithPlaywright(url: string, opts: RenderOptions = {}): Promise<RenderedPageAnalysis> {
  const norm = normalizeUrl(url);
  if (!norm || !(await assertPublicUrl(norm))) return { renderStatus: "skipped", renderError: "invalid_or_blocked_url" };

  const resolved = await resolveChromium();
  if (!resolved) return { renderStatus: "skipped", renderError: "no_browser_available" };

  const timeoutMs = opts.timeoutMs ?? 30_000;
  const mode = opts.mode ?? "full";
  const started = Date.now();

  let browser: Awaited<ReturnType<Awaited<typeof import("playwright-core")>["chromium"]["launch"]>> | null = null;
  try {
    const { chromium } = await import("playwright-core");
    browser = await chromium.launch({ headless: resolved.headless, executablePath: resolved.executablePath, args: resolved.args });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
      userAgent: SCANNER_UA,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
      acceptDownloads: false,
    });
    context.on("page", (p) => p.on("dialog", (d) => d.dismiss().catch(() => {})));
    await context.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "media" || type === "websocket" || type === "eventsource") return route.abort();
      if (mode === "fast" && (type === "image" || type === "font")) return route.abort();
      return route.continue();
    });

    const page = await context.newPage();
    let navErr: Error | null = null;
    const resp = await page.goto(norm, { waitUntil: "domcontentloaded", timeout: timeoutMs }).catch((e: Error) => {
      navErr = e;
      return null;
    });
    let status: RenderStatus = "success";
    if (navErr) status = /timeout/i.test((navErr as Error).message) ? "timeout" : "blocked";
    else if (!resp) status = "blocked";
    // Best-effort settle for client-rendered content.
    await page.waitForLoadState("networkidle", { timeout: Math.min(6000, timeoutMs) }).catch(() => {});

    const extracted = await page.evaluate(() => {
      const host = location.host.replace(/^www\./, "");
      const txt = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
      const headings = [...document.querySelectorAll("h1,h2,h3")].map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent ?? "").trim().slice(0, 200) })).filter((h) => h.text);
      const links = [...document.querySelectorAll("a[href]")].slice(0, 500).map((a) => {
        const href = (a as HTMLAnchorElement).href;
        let internal = false;
        try { internal = new URL(href).host.replace(/^www\./, "") === host; } catch { /* */ }
        return { href, internal };
      });
      const imgs = [...document.querySelectorAll("img")];
      const imagesNoAlt = imgs.filter((i) => !((i as HTMLImageElement).alt || "").trim()).length;
      const buttons = [...document.querySelectorAll('button,[role="button"]')];
      const buttonsWithoutName = buttons.filter((b) => !((b.textContent || "").trim() || b.getAttribute("aria-label"))).length;

      const style = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { selector: sel, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow };
      };
      const styles = ["body", "h1", "h2", "p", "a", "button"].map(style).filter(Boolean);

      // Resolve effective (non-transparent) background by walking up from body.
      const effBg = (() => {
        let el: Element | null = document.body;
        while (el) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
          el = el.parentElement;
        }
        return "rgb(255, 255, 255)";
      })();

      return {
        htmlLength: document.documentElement.outerHTML.length,
        textLength: txt.length,
        wordCount: txt ? txt.split(" ").filter(Boolean).length : 0,
        title: document.title || null,
        metaDescription: (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content || null,
        h1: (document.querySelector("h1")?.textContent || "").trim() || null,
        headingCount: headings.length,
        linkCount: links.length,
        internalLinkCount: links.filter((l) => l.internal).length,
        imageCount: imgs.length,
        imagesNoAlt,
        buttonCount: buttons.length,
        buttonsWithoutName,
        styles,
        effBg,
      };
    });

    // Contrast checks (computed in node).
    const s = Object.fromEntries((extracted.styles as ComputedElementStyle[]).map((x) => [x.selector, x]));
    const contrastChecks: ContrastCheck[] = [];
    const addContrast = (element: string, fg?: string, bg?: string) => {
      if (!fg || !bg) return;
      const ratio = contrastRatio(fg, bg);
      if (ratio == null) return;
      contrastChecks.push({ element, foreground: fg, background: bg, ratio, passAA: ratio >= 4.5, passAAA: ratio >= 7 });
    };
    addContrast("body text", s.body?.color, extracted.effBg);
    addContrast("paragraph", s.p?.color, extracted.effBg);
    addContrast("link", s.a?.color, extracted.effBg);
    addContrast("button", s.button?.color, s.button?.backgroundColor && s.button.backgroundColor !== "rgba(0, 0, 0, 0)" ? s.button.backgroundColor : undefined);

    const styleList = extracted.styles as ComputedElementStyle[];
    const fontFamilies = [...new Set(styleList.map((x) => x.fontFamily).filter(Boolean) as string[])].slice(0, 6);
    const fontSizes = [...new Set(styleList.map((x) => x.fontSize).filter(Boolean) as string[])];
    const borderRadii = [...new Set(styleList.map((x) => x.borderRadius).filter((r) => r && r !== "0px") as string[])];
    const primaryColors = [...new Set([s.a?.color, s.button?.backgroundColor, s.h1?.color].filter((c) => c && c !== "rgba(0, 0, 0, 0)") as string[])];
    const contrastFails = contrastChecks.filter((c) => !c.passAA).length;
    const visualConsistencyScore = Math.max(0, Math.min(100, 70 + (borderRadii.length ? 8 : 0) + (primaryColors.length ? 8 : 0) - contrastFails * 12));

    // Screenshot (full mode, best-effort).
    let screenshotUrl: string | undefined;
    if (opts.screenshot && mode === "full") {
      try {
        const buf = await page.screenshot({ fullPage: false, type: "png" });
        const key = `llm-reports/${opts.requestId ?? "req"}/${opts.pageKey ?? "page"}.png`;
        const up = await uploadFile(key, Buffer.from(buf), "image/png");
        screenshotUrl = up.url;
      } catch { /* screenshot/storage failure must not break the scan */ }
    }

    await browser.close().catch(() => {});
    browser = null;

    if (status === "timeout") return { renderStatus: "timeout", renderError: "navigation timeout", renderDurationMs: Date.now() - started };
    if (status === "blocked") return { renderStatus: "blocked", renderError: "navigation blocked", renderDurationMs: Date.now() - started };

    return {
      renderStatus: "success",
      renderDurationMs: Date.now() - started,
      renderedHtmlLength: extracted.htmlLength,
      renderedTextLength: extracted.textLength,
      renderedWordCount: extracted.wordCount,
      renderedTitle: extracted.title,
      renderedMetaDescription: extracted.metaDescription,
      renderedH1: extracted.h1,
      renderedHeadingCount: extracted.headingCount,
      renderedLinkCount: extracted.linkCount,
      renderedInternalLinkCount: extracted.internalLinkCount,
      renderedImageCount: extracted.imageCount,
      renderedImagesNoAlt: extracted.imagesNoAlt,
      renderedButtonCount: extracted.buttonCount,
      buttonsWithoutName: extracted.buttonsWithoutName,
      screenshotUrl,
      visualStyles: {
        primaryColors,
        bodyBackgroundColor: extracted.effBg,
        bodyTextColor: s.body?.color,
        styles: styleList,
        fontFamilies,
        fontSizes,
        borderRadii,
        contrastChecks,
        visualConsistencyScore,
      },
    };
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return { renderStatus: "failed", renderError: (e as Error).message.slice(0, 200), renderDurationMs: Date.now() - started };
  }
}
