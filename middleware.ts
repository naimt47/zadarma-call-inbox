import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware runs on Edge Runtime - can't use Node.js modules like crypto or database
// So we validate device tokens via internal API call
export async function middleware(request: NextRequest) {
  // Allow login page with token, restore page, and API routes
  if (
    request.nextUrl.pathname.startsWith('/login/') ||
    request.nextUrl.pathname === '/api/login' ||
    request.nextUrl.pathname === '/api/validate-login-token' ||
    request.nextUrl.pathname === '/api/restore-session' ||
    request.nextUrl.pathname === '/api/validate-device-token' ||
    request.nextUrl.pathname === '/restore' ||
    request.nextUrl.pathname === '/404'
  ) {
    return NextResponse.next();
  }
  
  // Check authentication for protected routes
  if (
    request.nextUrl.pathname.startsWith('/calls') || 
    request.nextUrl.pathname.startsWith('/api/calls') ||
    request.nextUrl.pathname.startsWith('/mappings') ||
    request.nextUrl.pathname.startsWith('/api/mappings')
  ) {
    // PRIMARY: Check cookie first (fastest path)
    const cookieToken = request.cookies.get('device_token')?.value;
    if (cookieToken) {
      return NextResponse.next(); // Cookie exists, allow through
    }
    
    // SECONDARY: Check x-device-token header (from localStorage in API calls)
    // This only works for API routes, not page navigations (browsers don't send custom headers for page requests)
    const headerToken = request.headers.get('x-device-token');
    if (headerToken) {
      // Validate token via internal API call
      try {
        const baseUrl = request.nextUrl.origin;
        const validateUrl = new URL('/api/validate-device-token', baseUrl);
        
        const validateResponse = await fetch(validateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceToken: headerToken }),
        });
        
        if (validateResponse.ok) {
          // Token is valid - SET COOKIE and allow request
          const response = NextResponse.next();
          const isHttps = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
          const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
          
          response.cookies.set('device_token', headerToken, {
            httpOnly: false,
            secure: isHttps,
            sameSite: 'lax' as const,
            maxAge: 10 * 365 * 24 * 60 * 60, // 10 years in seconds
            expires: expires,
            path: '/',
          });
          
          return response;
        }
      } catch (error) {
        console.error('Middleware token validation error:', error);
        // Fall through to redirect
      }
    }
    
    // No valid auth found
    // For page navigations: redirect to restore (which will check localStorage and set cookie)
    // For API calls: return 401 (client should handle this)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.redirect(new URL('/restore', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/calls/:path*', '/api/calls/:path*', '/mappings/:path*', '/api/mappings/:path*', '/login/:path*', '/restore'],
};

