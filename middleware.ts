import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow login page and API login endpoint
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }
  
  // Allow public assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }
  
  // Check if session cookie exists (lightweight check for Edge Runtime)
  // Full validation happens in server components and API routes
  const sessionToken = request.cookies.get('call_inbox_session')?.value;
  
  if (!sessionToken) {
    // No session token, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Cookie exists, allow through
  // Full validation will happen in the server component/API route (Node.js runtime)
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

