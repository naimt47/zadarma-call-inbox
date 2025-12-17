'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RestorePage() {
  const router = useRouter();

  useEffect(() => {
    async function restoreSession() {
      const backupToken = localStorage.getItem('session_token_backup');
      const expiresStr = localStorage.getItem('session_expires');

      if (backupToken && expiresStr) {
        const expires = new Date(expiresStr);
        if (expires > new Date()) {
          try {
            const res = await fetch('/api/restore-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: backupToken }),
              credentials: 'include',
            });

            if (res.ok) {
              // Cookie restored, force full page reload to ensure cookie is sent
              window.location.href = '/calls';
              return;
            }
          } catch (err) {
            console.error('Failed to restore session:', err);
          }
        } else {
          // Expired, clear it
          localStorage.removeItem('session_token_backup');
          localStorage.removeItem('session_expires');
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

