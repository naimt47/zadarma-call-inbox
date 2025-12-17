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
 * Database format: "38651395476" or "49123456789" (country code + number, no spaces)
 * Slovenia: display as "051 395 476" (add leading 0, format with spaces)
 * Foreign: display as "+49123456789" (add + prefix)
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 0) return phone;
  
  // Slovenia (starts with 386)
  if (normalized.startsWith('386')) {
    const local = normalized.substring(3); // Remove "386"
    const withZero = local.startsWith('0') ? local : `0${local}`; // Add leading 0 if not present
    
    // Format: "051 395 476"
    if (withZero.length >= 9) {
      return `${withZero.substring(0, 3)} ${withZero.substring(3, 6)} ${withZero.substring(6)}`;
    }
    return withZero;
  }
  
  // Foreign countries: add + prefix
  return `+${normalized}`;
}

