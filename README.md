# Zadarma Call Inbox

A Next.js webapp for partners to view, claim, and manage missed calls in real-time.

## Features

- 🔐 **Password-based authentication** with persistent sessions (30 days)
- 📞 **Real-time call updates** using Server-Sent Events (SSE)
- 🔔 **OneSignal push notifications** when calls are claimed/handled
- 📋 **Extension mapping management** - Add, edit, and delete phone-to-extension mappings
- 📱 **Mobile-friendly** UI that works on phones and laptops
- 🚀 **Serverless-ready** with Postgres session storage

## Setup

### 1. Environment Variables

Create `.env.local` file in the root directory with the following content:

```bash
# Database (shared with webhook project)
POSTGRES_URL=postgresql://user:password@host:port/database

# OneSignal Configuration
ONESIGNAL_APP_ID=c2084904-2b91-429e-b801-6071f3c75c0f
ONESIGNAL_REST_API_KEY=os_v2_app_yieesbblsfbj5oabmby7hr24b6qmolrxeh2esnv2lqn7y6btgw53q7bwkfxxaczhybllajf66vewiltusodbqej6es45tynm3ytpx2y

# Authentication
CALL_INBOX_PASSWORD=cfcbdb854280bbfa09f38067153ccba4cf1449c52ca04788b602c1120f2c6325
```

**Quick Setup:**
- Run `powershell -ExecutionPolicy Bypass -File create-env.ps1` from the project root
- Or manually create `.env.local` and copy the content above
- **Important:** Update `POSTGRES_URL` with your actual database connection string

### 2. Database Setup

Create the `user_sessions` table in your Postgres database:

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  session_token TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel

1. Create a new Vercel project
2. Connect your repository
3. Add environment variables in Vercel dashboard
4. Deploy

The app will be available at your Vercel domain (e.g., `calls.nva.global`).

## API Routes

### Calls
- `GET /api/calls` - Fetch all missed/claimed calls
- `GET /api/calls/stream` - SSE stream for real-time updates
- `PATCH /api/calls/[phone_norm]` - Update call status (claim/handle)

### Mappings
- `GET /api/mappings` - Fetch all extension mappings
- `POST /api/mappings` - Create new extension mapping
- `PATCH /api/mappings/[phone_norm]` - Update extension mapping
- `DELETE /api/mappings/[phone_norm]` - Delete extension mapping

## Security

- Sessions stored in Postgres (required for serverless)
- HttpOnly cookies prevent XSS attacks
- Secure flag enabled in production (HTTPS only)
- Password-based authentication for 3 partners

## Notes

- Real-time updates use Server-Sent Events (SSE), not polling
- Sessions persist for 30 days
- OneSignal notifications are optional (app works without them)
- All database queries use parameterized queries to prevent SQL injection
