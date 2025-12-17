import { NextResponse } from 'next/server';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    const isValid = await verifyPassword(password);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Create session
    const sessionToken = await createSession();
    
    // Set cookie
    await setSessionCookie(sessionToken);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

