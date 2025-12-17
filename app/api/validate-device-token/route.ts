import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/auth';

// Lightweight endpoint for middleware to validate device tokens
// Returns 200 if valid, 401 if invalid
export async function POST(req: Request) {
  try {
    const { deviceToken } = await req.json();
    
    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    
    const validation = await validateDeviceToken(deviceToken);
    
    if (validation.valid) {
      return NextResponse.json({ 
        valid: true,
        extension: validation.extension,
      });
    }
    
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    console.error('Validate device token error:', error);
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
