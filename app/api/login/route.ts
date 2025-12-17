import { NextResponse } from 'next/server';
import { createSession, verifyPassword, COOKIE_CONFIG, getCookieOptions } from '@/lib/auth';

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
    
    const sessionToken = await createSession();
    
    // Create response and set cookie on it (must be on the returned response)
    const response = NextResponse.json({ success: true });
    
    // Use dynamically calculated cookie options to ensure expires date is current
    response.cookies.set(COOKIE_CONFIG.name, sessionToken, getCookieOptions());
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
