import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefresh = request.cookies.has('lk_refresh');

  // Protected routes: require refresh cookie
  if (pathname.startsWith('/app')) {
    if (!hasRefresh) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Login page: redirect to app if already authenticated
  if (pathname === '/login') {
    if (hasRefresh) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};
