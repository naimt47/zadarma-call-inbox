# Testing Push Notifications

## How OneSignal Web Push Works

**Yes, you CAN get push notifications on your phone**, but with some limitations:

### ✅ What Works:
- **Mobile browsers** (Chrome on Android, Safari on iOS 16.4+)
- **Desktop browsers** (Chrome, Firefox, Edge, Safari)
- Works when browser is **closed** (service worker handles it)
- Works when phone is **locked** (OS shows notification)

### ⚠️ Requirements:
1. **User must visit your site** and allow notifications
2. **Browser must support Web Push** (most modern browsers do)
3. **Service worker must be active** (OneSignal handles this)

### 📱 Mobile Specifics:
- **Android**: Chrome, Firefox, Edge - Full support
- **iOS**: Safari 16.4+ only (older iOS versions don't support web push)
- **Native apps**: Would need separate OneSignal native SDK

## Testing with SQL

### Option 1: Insert Test Call (Will automatically trigger OneSignal notification!)

```sql
INSERT INTO call_claims (
  phone_norm,
  last_pbx_call_id,
  status,
  handled_by_ext,
  updated_at,
  expires_at
) VALUES (
  '38651234567',  -- Test phone number (Slovenia format)
  'test-call-' || extract(epoch from now())::text,  -- Unique call ID
  'missed',
  NULL,
  NOW(),
  NOW() + INTERVAL '1 hour'  -- Expires in 1 hour
)
ON CONFLICT (phone_norm) 
DO UPDATE SET
  status = 'missed',
  last_pbx_call_id = EXCLUDED.last_pbx_call_id,
  updated_at = NOW(),
  expires_at = NOW() + INTERVAL '1 hour';
```

### Option 2: Insert Multiple Test Calls

```sql
-- Insert 3 test calls with different phone numbers
INSERT INTO call_claims (phone_norm, last_pbx_call_id, status, handled_by_ext, updated_at, expires_at)
VALUES 
  ('38651234567', 'test-call-1-' || extract(epoch from now())::text, 'missed', NULL, NOW(), NOW() + INTERVAL '1 hour'),
  ('38651234568', 'test-call-2-' || extract(epoch from now())::text, 'missed', NULL, NOW(), NOW() + INTERVAL '1 hour'),
  ('38651234569', 'test-call-3-' || extract(epoch from now())::text, 'missed', NULL, NOW(), NOW() + INTERVAL '1 hour')
ON CONFLICT (phone_norm) 
DO UPDATE SET
  status = 'missed',
  last_pbx_call_id = EXCLUDED.last_pbx_call_id,
  updated_at = NOW(),
  expires_at = NOW() + INTERVAL '1 hour';
```



$headers = @{
    "Content-Type" = "application/json"
    "x-auth-password" = "cfcbdb854280bbfa09f38067153ccba4cf1449c52ca04788b602c1120f2c6325"
}
$body = @{
    phone = "38651234567"
    status = "missed"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://calls.nva.global/api/notify" -Method POST -Headers $headers -Body $body



## OneSignal Notifications Setup

**You need to add ONE line of code to your webhook handler.**

See `WEBHOOK_INTEGRATION.md` for the exact code to add. It's literally just a fetch() call after you insert the call_claims entry.

### How It Works

Your webhook handler calls `/api/notify` when it creates a new missed call. That's it.

You can also manually test it:

**Linux/Mac/Git Bash:**
```bash
curl -X POST https://calls.nva.global/api/notify \
  -H "Content-Type: application/json" \
  -H "x-auth-password: YOUR_PASSWORD" \
  -d '{"phone": "38651234567", "status": "missed"}'
```

**Windows PowerShell:**
```powershell
# Option 1: Use curl.exe explicitly
curl.exe -X POST https://calls.nva.global/api/notify -H "Content-Type: application/json" -H "x-auth-password: YOUR_PASSWORD" -d "{\"phone\": \"38651234567\", \"status\": \"missed\"}"

# Option 2: Use PowerShell's Invoke-RestMethod (recommended)
Invoke-RestMethod -Uri "https://calls.nva.global/api/notify" -Method POST -Headers @{"Content-Type"="application/json"; "x-auth-password"="YOUR_PASSWORD"} -Body '{"phone":"38651234567","status":"missed"}'
```

**Windows CMD:**
```cmd
curl.exe -X POST https://calls.nva.global/api/notify -H "Content-Type: application/json" -H "x-auth-password: YOUR_PASSWORD" -d "{\"phone\": \"38651234567\", \"status\": \"missed\"}"
```

**See `WEBHOOK_INTEGRATION.md` for the exact code to add to your webhook handler.**

## Testing Steps

1. **Add the code from `WEBHOOK_INTEGRATION.md` to your webhook handler**
2. **Visit your app** in a mobile browser (Chrome on Android or Safari on iOS 16.4+)
3. **Allow notifications** when prompted (OneSignal will ask for permission)
4. **Run the SQL command** above to insert a test call
5. **Manually trigger notification** using the curl command below (until you add it to webhook)
6. **Check your phone** - you should receive a OneSignal push notification even if the browser is closed!

## Notes

- ✅ **Browser notifications** (from SSE) work immediately when a new call appears in the UI
- ✅ **OneSignal push notifications** are sent when your webhook handler calls `/api/notify`
- ✅ **Always works** - doesn't depend on users having the app open
- ✅ **No duplicates** - only called once when call is created
- Make sure `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are set in your environment variables
- Make sure `CALL_INBOX_PASSWORD` is set in your webhook handler project
