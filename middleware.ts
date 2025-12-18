import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/a7f3b2c9d1e4f5g6h8i0j2k4';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow login page and API login
  if (pathname === LOGIN_PATH || pathname === '/api/login') {
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
  
  // For API routes, validation happens in the route handler (checks password header)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // For pages, allow through - client-side checks for password in localStorage
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
