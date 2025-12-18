/**
 * Password-based authentication - no sessions, cookies, or tokens
 * Password is stored in localStorage and sent with every request
 */

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
 * Validate auth from request header (password-based)
 */
export async function validateAuth(req: Request): Promise<{ valid: boolean }> {
  try {
    const password = req.headers.get('x-auth-password');
    
    if (!password) {
      return { valid: false };
    }
    
    const isValid = await verifyPassword(password);
    return { valid: isValid };
  } catch (error) {
    console.error('Error validating auth:', error);
    return { valid: false };
  }
}
