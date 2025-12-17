import { NextResponse } from 'next/server';
import { getSessionFromRequest, validateSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/utils';

// GET /api/mappings - List all mappings
export async function GET(req: Request) {
  try {
    // Check authentication
    const sessionToken = await getSessionFromRequest();
    if (!await validateSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Query all mappings (including expired ones for management)
    const result = await query(
      `SELECT 
        phone_number,
        extension,
        created_at,
        expires_at
      FROM zadarma_extension_mappings
      ORDER BY created_at DESC
      LIMIT 500`
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching mappings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mappings - Create new mapping
export async function POST(req: Request) {
  try {
    // Check authentication
    const sessionToken = await getSessionFromRequest();
    if (!await validateSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { phone_number, extension, expires_at } = body;
    
    // Validate required fields
    if (!phone_number || typeof phone_number !== 'string') {
      return NextResponse.json(
        { error: 'phone_number is required' },
        { status: 400 }
      );
    }
    
    if (!extension || typeof extension !== 'string') {
      return NextResponse.json(
        { error: 'extension is required' },
        { status: 400 }
      );
    }
    
    if (!expires_at || typeof expires_at !== 'string') {
      return NextResponse.json(
        { error: 'expires_at is required (ISO date string)' },
        { status: 400 }
      );
    }
    
    const phoneNorm = normalizePhoneNumber(phone_number);
    const expiresAt = new Date(expires_at);
    
    // Validate date
    if (isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { error: 'expires_at must be a valid date' },
        { status: 400 }
      );
    }
    
    // Insert new mapping (use ON CONFLICT to update if exists)
    const result = await query(
      `INSERT INTO zadarma_extension_mappings (phone_number, extension, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone_number) 
       DO UPDATE SET 
         extension = EXCLUDED.extension,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()
       RETURNING phone_number, extension, created_at, expires_at`,
      [phoneNorm, extension, expiresAt]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

