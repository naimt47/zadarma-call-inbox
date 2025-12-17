/**
 * Normalize phone number to consistent format
 * Removes all non-digit characters and ensures consistent format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Return normalized phone (just digits)
  return digits;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 0) return phone;
  
  // Format as: +XXX XX XXX XXXX (adjust based on your country format)
  // For now, return as-is or add basic formatting
  if (normalized.length > 10) {
    return `+${normalized.slice(0, -10)} ${normalized.slice(-10, -7)} ${normalized.slice(-7, -4)} ${normalized.slice(-4)}`;
  }
  
  return normalized;
}

