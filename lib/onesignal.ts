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
  status: 'claimed' | 'handled';
  extension: string;
}

export async function sendCallStatusNotification(data: NotificationData): Promise<void> {
  const oneSignalClient = getOneSignalClient();
  
  if (!oneSignalClient) {
    console.log('OneSignal not configured, skipping notification:', data);
    return;
  }
  
  try {
    const message = `Call from ${data.phone} was ${data.status} by ${data.extension}`;
    
    const notification = {
      contents: {
        en: message,
      },
      // Send to all subscribers (all 3 partners)
      included_segments: ['All'],
    };
    
    await oneSignalClient.createNotification(notification);
    console.log('OneSignal notification sent:', message);
  } catch (error) {
    console.error('Failed to send OneSignal notification:', error);
    // Don't throw - notifications are non-critical
  }
}

