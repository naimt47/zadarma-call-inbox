import { query } from './db';

const SESSION_COOKIE_NAME = 'call_inbox_session';
const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 365 days

/**
 * Generate secure session token using Web Crypto API
 */
export async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create session in database
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
 * Validate session token
 */
export async function validateSession(token: string | null): Promise<boolean> {
  if (!token) return false;
  
  try {
    const result = await query(
      'SELECT expires_at FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      await query('DELETE FROM user_sessions WHERE session_token = $1', [token]);
      return false;
    }
    
    return true;
  } catch (error: any) {
    if (error.code === '42P01') {
      return false;
    }
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Verify password
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
 * Get session token from cookie header (for API routes)
 */
export function getSessionFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  
  if (sessionCookie) {
    const equalIndex = sessionCookie.indexOf('=');
    if (equalIndex !== -1) {
      return sessionCookie.substring(equalIndex + 1);
    }
  }
  
  return null;
}

/**
 * Validate auth from request (for API routes)
 */
export async function validateAuth(req: Request): Promise<{ valid: boolean; token: string | null }> {
  try {
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = getSessionFromCookieHeader(cookieHeader);
    
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

/**
 * Get session from Next.js cookies (for server components)
 */
export async function getSessionFromRequest(): Promise<string | null> {
  try {
    // Dynamic import for server components (cookies() must be called in async context)
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  } catch (error) {
    return null;
  }
}

/**
 * Cookie configuration for persistence
 * maxAge is in SECONDS (one year = 60 * 60 * 24 * 365)
 * expires should be calculated dynamically when setting the cookie
 */
export const COOKIE_CONFIG = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // One year in seconds (not milliseconds)
  maxAge: 60 * 60 * 24 * 365,
  // domain: '.yourdomain.com' // Uncomment when using custom domain for cross-subdomain
};

/**
 * Get cookie options with dynamically calculated expires date
 * This ensures the expires date is always current when setting the cookie
 */
export function getCookieOptions() {
  return {
    httpOnly: COOKIE_CONFIG.httpOnly,
    secure: COOKIE_CONFIG.secure,
    sameSite: COOKIE_CONFIG.sameSite,
    path: COOKIE_CONFIG.path,
    maxAge: COOKIE_CONFIG.maxAge,
    // Calculate expires date dynamically (one year from now)
    expires: new Date(Date.now() + 1000 * COOKIE_CONFIG.maxAge),
    // domain: COOKIE_CONFIG.domain, // Uncomment if needed for custom domain
  };
}
