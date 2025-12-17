import { validateAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  // Check authentication (device token or session token)
  const auth = await validateAuth(req);
  if (!auth.valid) {
    console.log('SSE: Authentication failed');
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      
      let lastUpdateTime: Date | null = null;
      let heartbeatCount = 0;
      
      // Poll database every 2 seconds and send updates
      const interval = setInterval(async () => {
        try {
          let result;
          
          if (lastUpdateTime === null) {
            // First poll: get all calls
            result = await query(
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
          } else {
            // Subsequent polls: get only updated calls
            result = await query(
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
                AND updated_at > $1
              ORDER BY updated_at DESC
              LIMIT 100`,
              [lastUpdateTime]
            );
          }
          
          // Update last check time
          lastUpdateTime = new Date();
          
          // Send updates if there are any
          if (result.rows.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'update', calls: result.rows })}\n\n`)
            );
          } else {
            // Send heartbeat every 10 seconds to keep connection alive
            heartbeatCount++;
            if (heartbeatCount % 5 === 0) { // Every 10 seconds (5 * 2 seconds)
              controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
            }
          }
        } catch (error) {
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

