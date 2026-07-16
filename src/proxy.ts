import { NextResponse, type NextRequest } from "next/server";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
} from "@/lib/i18n/config";

/**
 * Next.js 16 proxy (formerly middleware).
 * 1. Locale routing: prefixes public routes with a locale (/en/..., /hr/...).
 * 2. Optimistic admin protection: redirects to /administracija when no session
 *    cookie is present. Real authorization happens in the admin layout and
 *    in every server action (defense in depth).
 */

const PUBLIC_FILE = /\.[^/]+$/;

/** Administration surfaces that must never be indexed, at any depth. */
const NOINDEX_PREFIXES = ["/administracija", "/hvac/superadministracija", "/bisneyscrm"];

function isNoIndexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Defence-in-depth against search indexing of administration routes.
 * Authorization is the real control; this header is an additional layer
 * alongside page metadata, robots.txt and sitemap exclusion.
 */
function noIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return res;
}

function pickLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const accept = request.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (code && isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy admin route → canonical /administracija.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const rest = pathname.slice("/admin".length); // "" or "/…"
    const url = new URL(`/administracija${rest}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // Admin: optimistic session check (cookie presence only).
  if (pathname.startsWith("/administracija")) {
    if (pathname === "/administracija") return noIndex(NextResponse.next());
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = new URL("/administracija", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return noIndex(NextResponse.redirect(url));
    }
    return noIndex(NextResponse.next());
  }

  // Bisneys CRM: isolated internal app under /bisneyscrm. Never indexed; skips
  // locale routing; optimistic session-cookie guard. Real authorization happens
  // in the (app) layout and in every server action (defense in depth).
  if (pathname === "/bisneyscrm" || pathname.startsWith("/bisneyscrm/")) {
    const isPublic = pathname === "/bisneyscrm" || pathname === "/bisneyscrm/login";
    if (!isPublic && !request.cookies.has("bisneys_session")) {
      return noIndex(NextResponse.redirect(new URL("/bisneyscrm/login", request.url)));
    }
    return noIndex(NextResponse.next());
  }

  // Varel Electric: /electro public marketing pages are indexable Croatian
  // pages outside the locale scheme; the app and superadministration are
  // cookie-gated optimistically here and noindexed. Real authorization happens
  // in the layouts, guards and every server action (defense in depth).
  if (pathname === "/electro" || pathname.startsWith("/electro/")) {
    if (pathname.startsWith("/electro/superadministracija")) {
      const isLogin = pathname === "/electro/superadministracija/prijava";
      if (!isLogin && !request.cookies.has("electro_sa_session")) {
        return noIndex(NextResponse.redirect(new URL("/electro/superadministracija/prijava", request.url)));
      }
      return noIndex(NextResponse.next());
    }
    if (pathname.startsWith("/electro/app")) {
      if (!request.cookies.has("electro_session")) {
        return noIndex(NextResponse.redirect(new URL("/electro/prijava", request.url)));
      }
      return noIndex(NextResponse.next());
    }
    return NextResponse.next();
  }

  // HVAC superadministration: never indexed. Real authorization happens in the
  // page guards (requireSuperadmin) — this only adds the header layer.
  if (isNoIndexPath(pathname)) return noIndex(NextResponse.next());

  // Skip API routes, affiliate redirects, files, and Next.js internals.
  // Varel HVAC is a Croatian-only product served on unprefixed routes
  // (/hvac, /hvac-demo, /hvac-b2b) — no locale segment.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/go/") ||
    pathname.startsWith("/o/") ||
    pathname === "/hvac" ||
    pathname.startsWith("/hvac-") ||
    pathname.startsWith("/hvac/") ||
    pathname.startsWith("/_next") ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/sitemap") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Already has a supported locale prefix?
  const firstSegment = pathname.split("/")[1] ?? "";
  if (isLocale(firstSegment)) return NextResponse.next();

  // Redirect to the detected locale.
  const locale = pickLocale(request);
  const url = new URL(
    `/${locale}${pathname === "/" ? "" : pathname}`,
    request.url
  );
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
