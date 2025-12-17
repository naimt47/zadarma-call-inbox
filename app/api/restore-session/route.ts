import { NextResponse } from 'next/server';
import { validateSession, setSessionCookie } from '@/lib/auth';

const SESSION_COOKIE_NAME = 'call_inbox_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(req: Request) {
  try {
    const { sessionToken } = await req.json();
    
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }
    
    // Validate the session token from database
    const isValid = await validateSession(sessionToken);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
    
    // Restore the cookie
    const url = new URL(req.url);
    const isHttps = url.protocol === 'https:' || process.env.NODE_ENV === 'production';
    const expires = new Date(Date.now() + SESSION_DURATION_MS);
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: SESSION_DURATION_MS / 1000,
      expires: expires,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Restore session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

