import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Allow login page and API login
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/api/login') {
    return NextResponse.next();
  }
  
  // Check session for protected routes
  if (
    request.nextUrl.pathname.startsWith('/calls') || 
    request.nextUrl.pathname.startsWith('/api/calls') ||
    request.nextUrl.pathname.startsWith('/mappings') ||
    request.nextUrl.pathname.startsWith('/api/mappings')
  ) {
    const sessionToken = request.cookies.get('call_inbox_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Validate session (async DB call - middleware supports this in Node.js runtime)
    try {
      const isValid = await validateSession(sessionToken);
      if (!isValid) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      console.error('Middleware session validation error:', error);
      // On error, redirect to login for safety
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/calls/:path*', '/api/calls/:path*', '/mappings/:path*', '/api/mappings/:path*', '/login'],
};

