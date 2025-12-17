import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { deviceToken } = await req.json();
    
    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json({ error: 'Device token is required' }, { status: 400 });
    }
    
    // Validate the device token from database
    const validation = await validateDeviceToken(deviceToken);
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid or expired device token' }, { status: 401 });
    }
    
    // Token is valid - SET IT AS COOKIE so middleware can read it
    const url = new URL(req.url);
    const isHttps = url.protocol === 'https:' || process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ 
      success: true,
      extension: validation.extension,
    });
    
    // Set device token as cookie (CRITICAL - middleware reads this)
    const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years from now
    response.cookies.set('device_token', deviceToken, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax' as const,
      maxAge: 10 * 365 * 24 * 60 * 60, // 10 years in seconds
      expires: expires, // Explicit expiration date (REQUIRED for persistence on mobile browsers)
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Restore device token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

