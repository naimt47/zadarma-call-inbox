import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // Check authentication (device token or session token)
    const auth = await validateAuth(req);
    
    if (!auth.valid) {
      console.log('GET /api/calls: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Query call_claims table
    // Filter: status IN ('missed', 'claimed') AND expires_at > NOW()
    // Sort: updated_at DESC
    const queryText = `SELECT 
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
      LIMIT 100`;
    
    console.log('Executing query:', queryText);
    const result = await query(queryText);
    console.log(`Query returned ${result.rows.length} rows`);
    
    if (result.rows.length === 0) {
      // Check if table exists and has any data
      const tableCheck = await query(
        `SELECT COUNT(*) as total_count FROM call_claims`
      );
      console.log(`Total rows in call_claims table: ${tableCheck.rows[0]?.total_count || 0}`);
      
      const statusCheck = await query(
        `SELECT status, COUNT(*) as count FROM call_claims GROUP BY status`
      );
      console.log('Status distribution:', statusCheck.rows);
    }
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

