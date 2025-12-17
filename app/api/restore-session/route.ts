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
    
    // Token is valid, return success
    return NextResponse.json({ 
      success: true,
      extension: validation.extension,
    });
  } catch (error) {
    console.error('Restore device token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

