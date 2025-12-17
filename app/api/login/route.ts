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
    
    // Set session cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      expires: expires,
      path: '/',
    });
    
    // Set extension cookie
    response.cookies.set('user_extension', extension.trim(), {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      expires: expires,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

