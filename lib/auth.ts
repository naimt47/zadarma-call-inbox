/**
 * Password-based authentication - no sessions, cookies, or tokens
 * Password is stored in localStorage and sent with every request
 */

// Cache password in memory (env var doesn't change during runtime)
let cachedPassword: string | null = null;

function getCachedPassword(): string | null {
  if (cachedPassword === null) {
    cachedPassword = process.env.CALL_INBOX_PASSWORD || null;
    if (!cachedPassword) {
      console.error('CALL_INBOX_PASSWORD environment variable is not set');
    }
  }
  return cachedPassword;
}

// Simple in-memory cache for recently validated passwords (1 minute TTL)
// This is NOT a session/token - just a performance optimization
const validationCache = new Map<string, number>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function isPasswordCached(password: string): boolean {
  const cached = validationCache.get(password);
  if (cached && Date.now() - cached < CACHE_TTL_MS) {
    return true;
  }
  // Remove expired entry
  if (cached) {
    validationCache.delete(password);
  }
  return false;
}

function cachePassword(password: string): void {
  validationCache.set(password, Date.now());
  
  // Clean up old entries periodically (keep cache size reasonable)
  if (validationCache.size > 100) {
    const now = Date.now();
    for (const [pwd, timestamp] of validationCache.entries()) {
      if (now - timestamp >= CACHE_TTL_MS) {
        validationCache.delete(pwd);
      }
    }
  }
}

/**
 * Verify password against environment variable (optimized with caching)
 */
export function verifyPassword(password: string): boolean {
  // Check cache first (fast path)
  if (isPasswordCached(password)) {
    return true;
  }
  
  // Verify against env var
  const correctPassword = getCachedPassword();
  if (!correctPassword) {
    return false;
  }
  
  const isValid = password === correctPassword;
  
  // Cache valid passwords
  if (isValid) {
    cachePassword(password);
  }
  
  return isValid;
}

/**
 * Validate auth from request header (password-based, optimized)
 */
export function validateAuth(req: Request): { valid: boolean } {
  try {
    const password = req.headers.get('x-auth-password');
    
    if (!password) {
      return { valid: false };
    }
    
    const isValid = verifyPassword(password);
    return { valid: isValid };
  } catch (error) {
    console.error('Error validating auth:', error);
    return { valid: false };
  }
}
