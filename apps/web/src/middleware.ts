import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing, locales, LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const localeSet = new Set<string>(locales);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect legacy locale-prefixed URLs: /ru/app → /app (set cookie)
  const secondSlash = pathname.indexOf('/', 1);
  const possibleLocale = secondSlash === -1 ? pathname.slice(1) : pathname.slice(1, secondSlash);
  if (possibleLocale && localeSet.has(possibleLocale)) {
    const rest = secondSlash === -1 ? '/' : pathname.slice(secondSlash) || '/';
    const response = NextResponse.redirect(new URL(rest, request.url));
    response.cookies.set(LOCALE_COOKIE_NAME, possibleLocale, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE });
    return response;
  }

  const hasRefresh = request.cookies.has('lk_refresh');

  // Protected routes: require refresh cookie
  if (pathname.startsWith('/app') || pathname.startsWith('/invites')) {
    if (!hasRefresh) {
      const loginUrl = new URL('/login', request.url);
      if (pathname.startsWith('/invites')) {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  // Login page: redirect to app if already authenticated
  if (pathname === '/login' || pathname === '/login/') {
    if (hasRefresh) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
