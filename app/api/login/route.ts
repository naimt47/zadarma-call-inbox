import { NextResponse } from 'next/server';
import { createSession, setSessionCookie, setExtensionCookie, verifyPassword, validateLoginToken } from '@/lib/auth';

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
    await setSessionCookie(sessionToken);
    await setExtensionCookie(extension.trim());
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

