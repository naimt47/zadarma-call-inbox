import * as OneSignal from 'onesignal-node';

let client: OneSignal.Client | null = null;

function getOneSignalClient(): OneSignal.Client | null {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  
  if (!appId || !restApiKey) {
    console.warn('OneSignal credentials not configured. Notifications will be skipped.');
    console.warn(`ONESIGNAL_APP_ID: ${appId ? 'SET' : 'MISSING'}, ONESIGNAL_REST_API_KEY: ${restApiKey ? 'SET' : 'MISSING'}`);
    return null;
  }
  
  if (!client) {
    try {
      // Log first few characters of API key for verification (without exposing full key)
      const keyPreview = restApiKey ? `${restApiKey.substring(0, 10)}...` : 'MISSING';
      console.log(`Initializing OneSignal client with App ID: ${appId}, API Key: ${keyPreview}`);
      client = new OneSignal.Client(appId, restApiKey);
      console.log('OneSignal client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OneSignal client:', error);
      return null;
    }
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
  } catch (error: any) {
    console.error('Failed to send OneSignal notification:', error);
    // Log more details for debugging
    if (error.body) {
      console.error('OneSignal error body:', error.body);
    }
    if (error.statusCode) {
      console.error('OneSignal status code:', error.statusCode);
    }
    // Don't throw - notifications are non-critical
  }
}

