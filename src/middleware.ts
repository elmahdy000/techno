import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, isLocale } from "@/i18n/config";

const COOKIE = "locale";

function getLocale(request: NextRequest): (typeof locales)[number] {
  const cookie = request.cookies.get(COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("ar")) return "ar";
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );
  if (pathnameHasLocale) {
    // Forward the locale from the URL so the root layout can set dir/lang
    // correctly even when the user lands directly on a localized route
    // without a locale cookie (e.g. a shared /ar/... link).
    const locale = pathname.split("/")[1] as (typeof locales)[number];
    const response = NextResponse.next();
    response.headers.set("x-locale", locale);
    return response;
  }

  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|uploads|.*\\..*).*)"],
};
