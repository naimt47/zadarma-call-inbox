import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware runs on Edge Runtime - can't use Node.js modules like crypto or database
// So we do basic cookie check here, full validation happens in API routes
export async function middleware(request: NextRequest) {
  // Allow login page and API login
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/api/login') {
    return NextResponse.next();
  }
  
  // Check session cookie for protected routes
  if (
    request.nextUrl.pathname.startsWith('/calls') || 
    request.nextUrl.pathname.startsWith('/api/calls') ||
    request.nextUrl.pathname.startsWith('/mappings') ||
    request.nextUrl.pathname.startsWith('/api/mappings')
  ) {
    const sessionToken = request.cookies.get('call_inbox_session')?.value;
    
    // Basic check - full validation with DB happens in API routes
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/calls/:path*', '/api/calls/:path*', '/mappings/:path*', '/api/mappings/:path*', '/login'],
};

