-- Create user_sessions table for persistent session storage
-- This is REQUIRED for serverless environments (Vercel)
-- Memory-based sessions don't work in serverless functions

CREATE TABLE IF NOT EXISTS user_sessions (
  session_token TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);

-- Optional: Cleanup expired sessions periodically
-- You can run this as a cron job or scheduled task
-- DELETE FROM user_sessions WHERE expires_at < NOW();

