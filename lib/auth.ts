import { cookies } from 'next/headers';
import { query } from './db';

const SESSION_COOKIE_NAME = 'call_inbox_session';
const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 365 days - login once and stay logged in

/**
 * Generate a secure random session token using Web Crypto API (works in Edge Runtime)
 */
export async function generateSessionToken(): Promise<string> {
  // Use Web Crypto API which works in both Node.js and Edge Runtime
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new session in the database and return the token
 */
export async function createSession(): Promise<string> {
  const token = await generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  try {
    await query(
      'INSERT INTO user_sessions (session_token, expires_at) VALUES ($1, $2)',
      [token, expiresAt]
    );
  } catch (error: any) {
    // If table doesn't exist, create it
    if (error.code === '42P01') {
      await query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_token TEXT PRIMARY KEY,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await query(
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at)'
      );
      // Retry insert
      await query(
        'INSERT INTO user_sessions (session_token, expires_at) VALUES ($1, $2)',
        [token, expiresAt]
      );
    } else {
      throw error;
    }
  }
  
  return token;
}

/**
 * Validate a session token from the database
 */
export async function validateSession(token: string | null): Promise<boolean> {
  if (!token) return false;
  
  try {
    const result = await query(
      'SELECT expires_at FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      // Cleanup expired session
      await query('DELETE FROM user_sessions WHERE session_token = $1', [token]);
      return false;
    }
    
    return true;
  } catch (error: any) {
    // If table doesn't exist, return false
    if (error.code === '42P01') {
      return false;
    }
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Get session token from request cookies
 */
export async function getSessionFromRequest(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  } catch (error) {
    return null;
  }
}

/**
 * Set session cookie in the response
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

/**
 * Delete session from database and clear cookie
 */
export async function deleteSession(token: string | null): Promise<void> {
  if (!token) return;
  
  try {
    await query('DELETE FROM user_sessions WHERE session_token = $1', [token]);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
  
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    // Ignore cookie deletion errors
  }
}

/**
 * Verify password against environment variable
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const correctPassword = process.env.CALL_INBOX_PASSWORD;
  if (!correctPassword) {
    console.error('CALL_INBOX_PASSWORD environment variable is not set');
    return false;
  }
  
  return password === correctPassword;
}

/**
 * Validate authentication from request (for API routes)
 * Returns object with valid flag and session token
 */
export async function validateAuth(req: Request): Promise<{ valid: boolean; token: string | null }> {
  try {
    // Get session from cookie
    const cookieHeader = req.headers.get('cookie');
    let sessionToken: string | null = null;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (sessionCookie) {
        // Properly extract value after the = sign (handles cases where value might contain =)
        const equalIndex = sessionCookie.indexOf('=');
        if (equalIndex !== -1) {
          sessionToken = sessionCookie.substring(equalIndex + 1);
        }
      }
    }
    
    if (!sessionToken) {
      return { valid: false, token: null };
    }
    
    const isValid = await validateSession(sessionToken);
    return { valid: isValid, token: isValid ? sessionToken : null };
  } catch (error) {
    console.error('Error validating auth:', error);
    return { valid: false, token: null };
  }
}

