import * as OneSignal from 'onesignal-node';

let client: OneSignal.Client | null = null;

function getOneSignalClient(): OneSignal.Client | null {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  
  if (!appId || !restApiKey) {
    console.warn('OneSignal credentials not configured. Notifications will be skipped.');
    return null;
  }
  
  if (!client) {
    client = new OneSignal.Client(appId, restApiKey);
  }
  
  return client;
}

export interface NotificationData {
  phone: string;
  status: 'missed' | 'claimed' | 'handled';
  extension?: string;
}

export async function sendCallStatusNotification(data: NotificationData): Promise<void> {
  const oneSignalClient = getOneSignalClient();
  
  if (!oneSignalClient) {
    console.log('OneSignal not configured, skipping notification:', data);
    return;
  }
  
  try {
    let message: string;
    let title: string;
    
    if (data.status === 'missed') {
      title = 'New Missed Call';
      message = `Call from ${data.phone}`;
    } else {
      title = 'Call Updated';
      message = `Call from ${data.phone} was ${data.status} by ${data.extension || 'unknown'}`;
    }
    
    const notification = {
      contents: {
        en: message,
      },
      headings: {
        en: title,
      },
      // Send to all subscribers (all 3 partners)
      included_segments: ['All'],
      // Add URL to open the app
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://calls.nva.global/calls',
      // Priority for missed calls
      priority: data.status === 'missed' ? 10 : 5,
    };
    
    await oneSignalClient.createNotification(notification);
    console.log('OneSignal notification sent:', title, message);
  } catch (error) {
    console.error('Failed to send OneSignal notification:', error);
    // Don't throw - notifications are non-critical
  }
}

