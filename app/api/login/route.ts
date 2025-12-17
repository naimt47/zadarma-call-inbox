import { NextResponse } from 'next/server';
import { verifyPassword, validateLoginToken, createDeviceToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Validate login token from URL
    const url = new URL(req.url);
    const loginToken = url.searchParams.get('token');
    
    if (!validateLoginToken(loginToken)) {
      return NextResponse.json({ error: 'Invalid or missing access token' }, { status: 401 });
    }
    
    const { password, extension, deviceId } = await req.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    if (!extension || typeof extension !== 'string' || extension.trim() === '') {
      return NextResponse.json({ error: 'Extension is required' }, { status: 400 });
    }
    
    if (!await verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Create or reuse device token (never expires, for persistent login)
    // If deviceId is provided and token exists, it will be reused instead of creating new one
    const deviceToken = await createDeviceToken(extension.trim(), deviceId);
    
    // Create response with device token in body (stored in localStorage)
    const response = NextResponse.json({ 
      success: true,
      deviceToken: deviceToken, // Never expires, stored in localStorage
    });
    
    // Set device token as cookie (so middleware can read it)
    const isHttps = url.protocol === 'https:' || process.env.NODE_ENV === 'production';
    const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years from now
    response.cookies.set('device_token', deviceToken, {
      httpOnly: false, // Allow client-side access for localStorage backup
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: 10 * 365 * 24 * 60 * 60, // 10 years in seconds
      expires: expires, // Explicit expiration date (REQUIRED for persistence on mobile browsers)
      path: '/',
    });
    
    // Set extension cookie (for convenience, not for auth)
    response.cookies.set('user_extension', extension.trim(), {
      httpOnly: false, // Allow client-side access
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: 10 * 365 * 24 * 60 * 60, // 10 years
      path: '/',
    });
    
    console.log('Device token created:', {
      token: deviceToken.substring(0, 8) + '...',
      extension: extension.trim(),
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

