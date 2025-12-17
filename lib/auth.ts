import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getPool } from './db';

const SESSION_COOKIE_NAME = 'call_inbox_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ⚠️ DO NOT USE IN-MEMORY SESSIONS ON VERCEL (serverless)
// Serverless functions are stateless - memory is not shared between invocations
// MUST use Postgres for session storage

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  // MUST store in Postgres (serverless requires persistent storage)
  const dbPool = getPool();
  await dbPool.query(
    'INSERT INTO user_sessions (session_token, expires_at) VALUES ($1, $2)',
    [token, expiresAt]
  );
  
  return token;
}

export async function validateSession(token: string | null): Promise<boolean> {
  if (!token) {
    console.log('validateSession: No token provided');
    return false;
  }
  
  try {
    // MUST check Postgres (serverless requires persistent storage)
    const dbPool = getPool();
    
    const result = await dbPool.query(
      'SELECT expires_at FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [token]
    );
    
    const isValid = result.rows.length > 0;
    
    if (!isValid) {
      console.log('validateSession: Session not found or expired for token:', token.substring(0, 8) + '...');
    }
    
    return isValid;
  } catch (error) {
    console.error('validateSession error:', error);
    return false;
  }
}

export async function getSessionFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    expires: expires,
    path: '/',
  });
}

export async function setExtensionCookie(extension: string): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  
  cookieStore.set('user_extension', extension, {
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    expires: expires,
    path: '/',
  });
}

export async function getExtensionFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('user_extension')?.value || null;
}

export async function deleteSession(token: string): Promise<void> {
  const dbPool = getPool();
  await dbPool.query('DELETE FROM user_sessions WHERE session_token = $1', [token]);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const correctPassword = process.env.CALL_INBOX_PASSWORD;
  if (!correctPassword) return false;
  
  // Simple comparison (or use bcrypt for hashed passwords)
  return password === correctPassword;
  
  // Or with bcrypt:
  // const bcrypt = require('bcryptjs');
  // return await bcrypt.compare(password, correctPassword);
}

// Login page token validation
export function validateLoginToken(token: string | null): boolean {
  const validToken = process.env.LOGIN_ACCESS_TOKEN;
  if (!validToken) {
    console.error('LOGIN_ACCESS_TOKEN not set in environment variables');
    return false;
  }
  
  return token === validToken;
}
