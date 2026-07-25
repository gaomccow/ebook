/**
 * Security Utility: Input Sanitization & Validation
 * Protects against XSS, injection attacks, and illegal input formatting.
 */

/**
 * Escapes special HTML characters in a string to prevent XSS injection.
 */
export const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Trims whitespace and caps maximum string length.
 */
export const sanitizeString = (input: string, maxLength: number = 500): string => {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  const capped = trimmed.slice(0, maxLength);
  return escapeHtml(capped);
};

/**
 * Sanitizes class codes (alphanumeric, uppercase, exactly 6 chars).
 */
export const sanitizeClassCode = (code: string): string => {
  if (!code) return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

/**
 * Sanitizes student aliases (alphanumeric, max 30 chars).
 */
export const sanitizeAlias = (alias: string): string => {
  if (!alias) return '';
  return alias.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().slice(0, 30);
};

/**
 * Validates whether a string is a plausible email format.
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
