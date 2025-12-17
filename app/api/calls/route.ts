import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    console.log('GET /api/calls: Request received');
    
    // Check authentication (device token or session token)
    const auth = await validateAuth(req);
    
    if (!auth.valid) {
      console.log('GET /api/calls: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('GET /api/calls: Authentication successful');
    
    // First, check if table exists and get basic info
    try {
      const tableInfo = await query(
        `SELECT COUNT(*) as total_count FROM call_claims`
      );
      console.log(`GET /api/calls: Total rows in call_claims table: ${tableInfo.rows[0]?.total_count || 0}`);
    } catch (err: any) {
      console.error('GET /api/calls: Error checking table:', err.message);
    }
    
    // Check current time in database
    const timeCheck = await query(`SELECT NOW() as current_time, NOW() AT TIME ZONE 'UTC' as utc_time`);
    console.log('GET /api/calls: Database current time:', timeCheck.rows[0]);
    
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
    
    console.log('GET /api/calls: Executing query:', queryText);
    const result = await query(queryText);
    console.log(`GET /api/calls: Query returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log('GET /api/calls: First row sample:', {
        phone_norm: result.rows[0].phone_norm,
        status: result.rows[0].status,
        expires_at: result.rows[0].expires_at,
      });
    } else {
      // Check if table exists and has any data
      try {
        const tableCheck = await query(
          `SELECT COUNT(*) as total_count FROM call_claims`
        );
        console.log(`GET /api/calls: Total rows in call_claims table: ${tableCheck.rows[0]?.total_count || 0}`);
        
        const statusCheck = await query(
          `SELECT status, COUNT(*) as count FROM call_claims GROUP BY status`
        );
        console.log('GET /api/calls: Status distribution:', statusCheck.rows);
        
        // Check what rows exist that don't match the filter
        const allRows = await query(
          `SELECT phone_norm, status, expires_at, NOW() as current_time 
           FROM call_claims 
           ORDER BY updated_at DESC 
           LIMIT 5`
        );
        console.log('GET /api/calls: Sample rows (all statuses):', allRows.rows);
      } catch (err: any) {
        console.error('GET /api/calls: Error checking table data:', err.message);
      }
    }
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('GET /api/calls: Error fetching calls:', error);
    console.error('GET /api/calls: Error details:', {
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

