import { NextResponse } from 'next/server';
import { getSessionFromRequest, validateSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // Check authentication
    const sessionToken = await getSessionFromRequest();
    
    if (!sessionToken) {
      console.log('GET /api/calls: No session token in cookies');
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }
    
    const isValid = await validateSession(sessionToken);
    if (!isValid) {
      console.log('GET /api/calls: Session validation failed');
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
    }
    
    // Query call_claims table
    // Filter: status IN ('missed', 'claimed') AND expires_at > NOW()
    // Sort: updated_at DESC
    const result = await query(
      `SELECT 
        phone_norm,
        last_pbx_call_id,
        status,
        handled_by_ext,
        updated_at,
        expires_at
      FROM call_claims
      WHERE status IN ('missed', 'claimed')
        AND expires_at > NOW()
      ORDER BY updated_at DESC
      LIMIT 100`
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

