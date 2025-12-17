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
    console.log('Login: Created session token:', sessionToken.substring(0, 20) + '...');
    
    // Create response and set cookie on it (must be on the returned response)
    const response = NextResponse.json({ success: true });
    
    // Use dynamically calculated cookie options to ensure expires date is current
    const cookieOptions = getCookieOptions();
    console.log('Login: Setting cookie with options:', {
      name: COOKIE_CONFIG.name,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
      expires: cookieOptions.expires?.toISOString(),
    });
    
    response.cookies.set(COOKIE_CONFIG.name, sessionToken, cookieOptions);
    
    // Verify cookie was set
    const setCookie = response.cookies.get(COOKIE_CONFIG.name);
    console.log('Login: Cookie set in response:', setCookie ? 'YES' : 'NO', setCookie?.value?.substring(0, 20) + '...');
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
