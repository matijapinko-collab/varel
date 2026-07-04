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
 * 2. Optimistic admin protection: redirects to /admin/login when no session
 *    cookie is present. Real authorization happens in the admin layout and
 *    in every server action (defense in depth).
 */

const PUBLIC_FILE = /\.[^/]+$/;

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

  // Admin: optimistic session check (cookie presence only).
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Skip API routes, affiliate redirects, files, and Next.js internals.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/go/") ||
    pathname.startsWith("/o/") ||
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
