'use client';

import { useEffect } from 'react';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    OneSignalDeferred?: any[];
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    // Initialize OneSignal
    if (typeof window !== 'undefined') {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({
          appId: "c2084904-2b91-429e-b801-6071f3c75c0f",
        });
      });
    }
  }, []);

  return null;
}

