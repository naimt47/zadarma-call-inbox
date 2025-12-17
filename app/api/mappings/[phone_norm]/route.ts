import { NextResponse } from 'next/server';
import { getSessionFromRequest, validateSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/utils';

// PATCH /api/mappings/[phone_norm] - Update mapping
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ phone_norm: string }> }
) {
  try {
    // Check authentication
    const sessionToken = await getSessionFromRequest();
    if (!await validateSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { phone_norm: phoneNormParam } = await params;
    const phoneNorm = normalizePhoneNumber(phoneNormParam);
    
    const body = await req.json();
    const { extension, expires_at } = body;
    
    // Validate at least one field to update
    if (!extension && !expires_at) {
      return NextResponse.json(
        { error: 'At least one of extension or expires_at must be provided' },
        { status: 400 }
      );
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (extension !== undefined) {
      if (typeof extension !== 'string' || extension.trim() === '') {
        return NextResponse.json(
          { error: 'extension must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.push(`extension = $${paramIndex++}`);
      values.push(extension.trim());
    }
    
    if (expires_at !== undefined) {
      const expiresAt = new Date(expires_at);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json(
          { error: 'expires_at must be a valid date' },
          { status: 400 }
        );
      }
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expiresAt);
    }
    
    values.push(phoneNorm);
    
    const result = await query(
      `UPDATE zadarma_extension_mappings
       SET ${updates.join(', ')}
       WHERE phone_number = $${paramIndex}
       RETURNING phone_number, extension, created_at, expires_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mappings/[phone_norm] - Delete mapping
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ phone_norm: string }> }
) {
  try {
    // Check authentication
    const sessionToken = await getSessionFromRequest();
    if (!await validateSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { phone_norm: phoneNormParam } = await params;
    const phoneNorm = normalizePhoneNumber(phoneNormParam);
    
    // Delete from zadarma_extension_mappings
    const result = await query(
      'DELETE FROM zadarma_extension_mappings WHERE phone_number = $1 RETURNING phone_number',
      [phoneNorm]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, phone_number: result.rows[0].phone_number });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

