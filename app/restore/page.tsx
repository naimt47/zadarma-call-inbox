'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RestorePage() {
  const router = useRouter();

  useEffect(() => {
    async function restoreSession() {
      // First try device token (never expires, preferred method)
      const deviceToken = localStorage.getItem('device_token');
      if (deviceToken) {
        try {
          // Test if device token is valid by making a test API call
          const res = await fetch('/api/calls', {
            headers: {
              'x-device-token': deviceToken,
            },
            credentials: 'include',
          });

          if (res.ok || res.status === 200) {
            // Device token is valid, redirect to calls
            window.location.href = '/calls';
            return;
          }
        } catch (err) {
          console.error('Failed to validate device token:', err);
        }
      }

      // Try to restore device token if validation failed
      if (deviceToken) {
        try {
          const res = await fetch('/api/restore-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceToken }),
            credentials: 'include',
          });

          if (res.ok) {
            // Cookie is set, wait a moment for browser to process it, then redirect
            // This ensures the cookie is saved before middleware checks it
            setTimeout(() => {
              window.location.href = '/calls';
            }, 100);
            return;
          }
        } catch (err) {
          console.error('Failed to restore device token:', err);
        }
      }

      // No valid backup, redirect to 404
      router.push('/404');
    }

    restoreSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Restoring session...</div>
    </div>
  );
}

