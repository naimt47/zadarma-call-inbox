import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow login page and API login endpoint
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }
  
  // Allow public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/validate-login-token') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }
  
  // Check session for all other routes
  const sessionToken = request.cookies.get('call_inbox_session')?.value;
  
  if (!sessionToken) {
    // No session token, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Validate session
  const isValid = await validateSession(sessionToken);
  
  if (!isValid) {
    // Invalid session, redirect to login
    const loginUrl = new URL('/login', request.url);
    // Clear invalid cookie
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('call_inbox_session');
    return response;
  }
  
  // Valid session, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

