import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Determine locale from URL path
  const segments = pathname.split('/');
  const possibleLocale = segments[1];
  const isLocalePath = (routing.locales as readonly string[]).includes(possibleLocale);
  const pathWithoutLocale = isLocalePath
    ? '/' + segments.slice(2).join('/')
    : pathname;
  const locale = isLocalePath ? possibleLocale : routing.defaultLocale;

  const hasRefresh = request.cookies.has('lk_refresh');

  // Protected routes: require refresh cookie
  if (pathWithoutLocale.startsWith('/app')) {
    if (!hasRefresh) {
      const loginPath = locale === routing.defaultLocale ? '/login' : `/${locale}/login`;
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
  }

  // Login page: redirect to app if already authenticated
  if (pathWithoutLocale === '/login' || pathWithoutLocale === '/login/') {
    if (hasRefresh) {
      const appPath = locale === routing.defaultLocale ? '/app' : `/${locale}/app`;
      return NextResponse.redirect(new URL(appPath, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
