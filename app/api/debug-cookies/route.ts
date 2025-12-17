import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const cookies = req.cookies.getAll();
  const cookieHeader = req.headers.get('cookie');
  
  return NextResponse.json({
    cookies: cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })),
    cookieHeader: cookieHeader,
    hasSessionCookie: !!req.cookies.get('call_inbox_session'),
    sessionCookieValue: req.cookies.get('call_inbox_session')?.value?.substring(0, 20) + '...',
  });
}

