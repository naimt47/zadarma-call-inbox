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
    
    // Get query parameters
    const url = new URL(req.url);
    const searchPhone = url.searchParams.get('search') || '';
    const filterStatus = url.searchParams.get('status') || '';
    const filterExtension = url.searchParams.get('extension') || '';
    const includeExpired = url.searchParams.get('includeExpired') === 'true';
    const includeHandled = url.searchParams.get('includeHandled') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20', 10); // Default to 20 calls
    
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Status filter
    if (filterStatus) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filterStatus);
    } else if (!includeHandled) {
      // Default: only show missed and claimed (not handled)
      conditions.push(`status IN ('missed', 'claimed')`);
    }
    
    // Expiration filter - only apply if explicitly requested to exclude expired
    // By default, show all calls regardless of expiration (user wants to see recent calls)
    // This allows viewing calls even after they "expire"
    if (!includeExpired && url.searchParams.has('includeExpired')) {
      // Only filter if includeExpired was explicitly set to false
      conditions.push(`expires_at > NOW()`);
    }
    
    // Phone number search
    if (searchPhone) {
      const normalizedSearch = searchPhone.replace(/\D/g, ''); // Remove non-digits
      if (normalizedSearch) {
        conditions.push(`phone_norm LIKE $${paramIndex++}`);
        params.push(`%${normalizedSearch}%`);
      }
    }
    
    // Extension filter
    if (filterExtension) {
      conditions.push(`handled_by_ext = $${paramIndex++}`);
      params.push(filterExtension);
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    // Add limit to params
    params.push(limit);
    
    // Query call_claims table
    const result = await query(
      `SELECT 
        phone_norm,
        last_pbx_call_id,
        status,
        handled_by_ext,
        updated_at,
        expires_at
      FROM call_claims
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex}`,
      params
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

