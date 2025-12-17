import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getPool } from './db';

const DEVICE_TOKEN_HEADER = 'x-device-token';
const DEVICE_TOKEN_DURATION_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years (effectively permanent)

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
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

// Device token functions - these never expire (or expire very far in the future)
export async function createDeviceToken(extension: string): Promise<string> {
  const deviceToken = generateDeviceToken();
  const expiresAt = new Date(Date.now() + DEVICE_TOKEN_DURATION_MS);
  
  const dbPool = getPool();
  await dbPool.query(
    'INSERT INTO device_tokens (device_token, extension, expires_at) VALUES ($1, $2, $3) ON CONFLICT (device_token) DO UPDATE SET expires_at = $3, extension = $2',
    [deviceToken, extension, expiresAt]
  );
  
  return deviceToken;
}

export async function validateDeviceToken(deviceToken: string | null): Promise<{ valid: boolean; extension?: string }> {
  if (!deviceToken) {
    return { valid: false };
  }
  
  try {
    const dbPool = getPool();
    const result = await dbPool.query(
      'SELECT extension FROM device_tokens WHERE device_token = $1 AND expires_at > NOW()',
      [deviceToken]
    );
    
    if (result.rows.length > 0) {
      return { valid: true, extension: result.rows[0].extension };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('validateDeviceToken error:', error);
    return { valid: false };
  }
}

export function getDeviceTokenFromRequest(req: Request): string | null {
  // Check header first (preferred method)
  const headerToken = req.headers.get(DEVICE_TOKEN_HEADER);
  if (headerToken) {
    return headerToken;
  }
  
  // Check query param (for SSE which doesn't support custom headers)
  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get('device_token');
    if (queryToken) {
      return queryToken;
    }
  } catch (e) {
    // URL parsing failed, continue
  }
  
  // Fall back to cookie (for compatibility)
  // Note: We can't use cookies() here in all contexts, so we'll parse from headers
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/device_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Combined validation - only checks device token
export async function validateAuth(req: Request): Promise<{ valid: boolean; extension?: string }> {
  const deviceToken = getDeviceTokenFromRequest(req);
  if (deviceToken) {
    const deviceValidation = await validateDeviceToken(deviceToken);
    if (deviceValidation.valid) {
      return { valid: true, extension: deviceValidation.extension };
    }
  }
  
  return { valid: false };
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
