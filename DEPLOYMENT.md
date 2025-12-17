# Deployment Guide

## Prerequisites

1. **Postgres Database** (Neon Cloud)
   - Same database as the webhook project
   - Connection string: `POSTGRES_URL`

2. **OneSignal Account** (Optional)
   - App ID: `ONESIGNAL_APP_ID`
   - REST API Key: `ONESIGNAL_REST_API_KEY`

3. **Vercel Account**
   - For hosting the Next.js app

## Step 1: Database Setup

Run the SQL script to create the `user_sessions` table:

```sql
-- Run this in your Postgres database
CREATE TABLE IF NOT EXISTS user_sessions (
  session_token TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
```

You can use the provided `SETUP_DATABASE.sql` file.

## Step 2: Environment Variables

Set these in Vercel (or `.env.local` for local development):

```bash
# Required
POSTGRES_URL=postgresql://user:password@host:port/database
CALL_INBOX_PASSWORD=your-secure-password-here

# Optional (notifications will be skipped if not set)
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

## Step 3: Install Dependencies

```bash
cd zadarma-call-inbox
npm install
```

If you encounter npm registry issues, try:
```bash
npm install --legacy-peer-deps
```

## Step 4: Local Testing

```bash
npm run dev
```

Visit http://localhost:3000 and test:
1. Login with password
2. View calls
3. Claim a call
4. Mark as handled

## Step 5: Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts to:
1. Link to existing project or create new
2. Set environment variables
3. Deploy

### Option B: Vercel Dashboard

1. Go to https://vercel.com
2. Import your Git repository
3. Create new project: `zadarma-call-inbox`
4. Add environment variables
5. Deploy

## Step 6: Configure Domain

1. In Vercel dashboard, go to Project Settings → Domains
2. Add custom domain: `calls.nva.global`
3. Configure DNS records as instructed by Vercel

## Step 7: Verify Deployment

1. Visit `https://calls.nva.global`
2. Should redirect to `/login`
3. Login with password
4. Should see call inbox

## Troubleshooting

### Database Connection Issues
- Verify `POSTGRES_URL` is correct
- Check if database allows connections from Vercel IPs
- Ensure `user_sessions` table exists

### Session Issues
- Verify `user_sessions` table was created
- Check database connection
- Clear cookies and try again

### OneSignal Not Working
- Verify credentials are set
- Check OneSignal dashboard for delivery status
- App will work without OneSignal (notifications just won't send)

### Real-Time Updates Not Working
- Check browser console for SSE errors
- Verify `/api/calls/stream` endpoint is accessible
- Check network tab for EventSource connection

## Security Checklist

- ✅ Sessions stored in Postgres (not memory)
- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ Parameterized SQL queries (SQL injection protection)
- ✅ Password authentication
- ✅ Route protection via middleware

## Next Steps

1. Share the URL (`calls.nva.global`) with the 3 partners
2. They can bookmark it and login once (session lasts 30 days)
3. Monitor usage and adjust as needed

