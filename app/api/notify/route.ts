import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { sendCallStatusNotification } from '@/lib/onesignal';
import { normalizePhoneNumber } from '@/lib/utils';

/**
 * POST /api/notify - Trigger OneSignal notification for a new missed call
 * This endpoint can be called from your webhook handler when a new missed call is created
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const auth = await validateAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { phone, status = 'missed' } = body;
    
    if (!phone) {
      return NextResponse.json(
        { error: 'phone is required' },
        { status: 400 }
      );
    }
    
    const phoneNorm = normalizePhoneNumber(phone);
    
    // Send OneSignal notification
    await sendCallStatusNotification({
      phone: phoneNorm,
      status: status as 'missed' | 'claimed' | 'handled',
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent',
      phone: phoneNorm 
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
