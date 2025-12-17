import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendCallStatusNotification } from '@/lib/onesignal';
import { normalizePhoneNumber } from '@/lib/utils';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ phone_norm: string }> }
) {
  try {
    // Check authentication (device token or session token)
    const auth = await validateAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { phone_norm: phoneNormParam } = await params;
    const phoneNorm = normalizePhoneNumber(phoneNormParam);
    
    const body = await req.json();
    const { status, extension } = body;
    
    // Validate status
    const validStatuses = ['claimed', 'handled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate extension
    if (!extension || typeof extension !== 'string') {
      return NextResponse.json(
        { error: 'Extension is required' },
        { status: 400 }
      );
    }
    
    // Get current status to check if it changed
    const currentResult = await query(
      'SELECT status, handled_by_ext FROM call_claims WHERE phone_norm = $1',
      [phoneNorm]
    );
    
    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const currentStatus = currentResult.rows[0].status;
    const statusChanged = currentStatus !== status;
    
    // Update call_claims
    const updateResult = await query(
      `UPDATE call_claims
       SET status = $1,
           handled_by_ext = $2,
           updated_at = NOW()
       WHERE phone_norm = $3
       RETURNING phone_norm, status, handled_by_ext, updated_at, expires_at`,
      [status, extension, phoneNorm]
    );
    
    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update call' }, { status: 500 });
    }
    
    const updatedCall = updateResult.rows[0];
    
    // Send OneSignal notification if status changed
    if (statusChanged) {
      await sendCallStatusNotification({
        phone: phoneNorm,
        status: status as 'claimed' | 'handled',
        extension: extension,
      });
    }
    
    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error('Error updating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

