import { verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  // EventSource doesn't support custom headers, so get password from query param
  const url = new URL(req.url);
  const password = url.searchParams.get('password');
  
  if (!password) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const isValid = await verifyPassword(password);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      
      let heartbeatCount = 0;
      
      // Poll database every 2 seconds and send updates
      const interval = setInterval(async () => {
        try {
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
          
          // Always send full list to prevent calls from disappearing
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'update', calls: result.rows })}\n\n`)
          );
          
          // Send heartbeat every 10 seconds to keep connection alive
          heartbeatCount++;
          if (heartbeatCount % 5 === 0) { // Every 10 seconds (5 * 2 seconds)
            controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
          }
        } catch (error: any) {
          console.error('SSE stream error:', error);
          // Don't close on error, just log it
        }
      }, 2000); // Check every 2 seconds
      
      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}

