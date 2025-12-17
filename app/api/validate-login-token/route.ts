import { NextResponse } from 'next/server';
import { validateLoginToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    
    const isValid = validateLoginToken(token);
    
    if (isValid) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

