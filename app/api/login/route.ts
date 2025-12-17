import { NextResponse } from 'next/server';
import { createSession, verifyPassword, validateLoginToken } from '@/lib/auth';

const SESSION_COOKIE_NAME = 'call_inbox_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(req: Request) {
  try {
    // Validate login token from URL
    const url = new URL(req.url);
    const loginToken = url.searchParams.get('token');
    
    if (!validateLoginToken(loginToken)) {
      return NextResponse.json({ error: 'Invalid or missing access token' }, { status: 401 });
    }
    
    const { password, extension } = await req.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    if (!extension || typeof extension !== 'string' || extension.trim() === '') {
      return NextResponse.json({ error: 'Extension is required' }, { status: 400 });
    }
    
    if (!await verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    const sessionToken = await createSession();
    const expires = new Date(Date.now() + SESSION_DURATION_MS);
    
    // Create response with cookies set in headers
    const response = NextResponse.json({ success: true });
    
    // Determine if we're on HTTPS (for secure flag)
    // In production (Vercel), always HTTPS, so secure should be true
    // In development, check the request URL
    const isHttps = url.protocol === 'https:' || process.env.NODE_ENV === 'production';
    
    // CRITICAL: Cookies MUST have both maxAge AND expires for proper persistence
    // Without expires, some browsers treat it as a session cookie (cleared on close)
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps, // true in production (HTTPS), false in dev (HTTP)
      sameSite: 'lax' as const,
      maxAge: SESSION_DURATION_MS / 1000, // 30 days in seconds
      expires: expires, // CRITICAL: Explicit expiration date for persistence
      path: '/',
    };
    
    // Set session cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions);
    
    // Set extension cookie (same settings but httpOnly: false)
    response.cookies.set('user_extension', extension.trim(), {
      ...cookieOptions,
      httpOnly: false, // Allow client-side access
    });
    
    console.log('Session created:', {
      token: sessionToken.substring(0, 8) + '...',
      expires: expires.toISOString(),
      secure: isHttps,
      maxAge: SESSION_DURATION_MS / 1000,
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

