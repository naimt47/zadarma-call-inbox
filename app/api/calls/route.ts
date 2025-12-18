import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // Check authentication
    const auth = await validateAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Query call_claims table
    // Filter: status IN ('missed', 'claimed') AND expires_at > NOW()
    // Sort: updated_at DESC (uses index idx_call_claims_updated_at)
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
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

