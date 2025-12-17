import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow obscure login page and API login endpoint
  if (pathname === '/a7f3b2c9d1e4f5g6h8i0j2k4' || pathname === '/api/login') {
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
    // No session token, redirect to obscure login URL
    const loginUrl = new URL('/a7f3b2c9d1e4f5g6h8i0j2k4', request.url);
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

