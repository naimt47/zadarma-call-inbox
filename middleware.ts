import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/a7f3b2c9d1e4f5g6h8i0j2k4';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow login page and API login
  if (pathname === LOGIN_PATH || pathname === '/api/login' || pathname === '/api/debug-cookies') {
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
  
  // Check if session cookie exists (Edge Runtime can't access database)
  // Full validation happens in server components/API routes (Node.js runtime)
  const sessionToken = request.cookies.get('call_inbox_session')?.value;
  
  if (!sessionToken) {
    console.log('Middleware: No session cookie found, redirecting to login');
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  
  console.log('Middleware: Session cookie found:', sessionToken.substring(0, 20) + '...');
  
  // Cookie exists, allow through - validation happens in server components/API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
