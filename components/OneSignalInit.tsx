'use client';

import { useEffect } from 'react';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    // Initialize OneSignal
    if (typeof window !== 'undefined') {
      // Set up OneSignalDeferred before SDK loads
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      // Push initialization function
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          await OneSignal.init({
            appId: "c2084904-2b91-429e-b801-6071f3c75c0f",
          });
          
          // Store OneSignal instance for later use
          window.OneSignal = OneSignal;
          
          // Log initialization success
          console.log('OneSignal initialized successfully');
          
          // Check if user is already subscribed
          const isSubscribed = await OneSignal.isPushNotificationsEnabled();
          if (!isSubscribed) {
            // Prompt for permission (this will show browser permission dialog)
            await OneSignal.showSlidedownPrompt();
          }
        } catch (error) {
          console.error('OneSignal initialization error:', error);
        }
      });
      
      // If SDK is already loaded, initialize immediately
      if (window.OneSignal) {
        window.OneSignalDeferred.forEach((fn: any) => {
          if (typeof fn === 'function') {
            fn(window.OneSignal);
          }
        });
      }
    }
  }, []);

  return null;
}

