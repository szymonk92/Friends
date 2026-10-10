/**
 * PII helpers — phone/email handling.
 * NEVER log phone or email values; redact before logging if absolutely needed.
 */

const PHONE_ALLOWED = /^[+\d][\d\s().-]{2,31}$/;

export function normalizePhone(input: string): string {
  // Keep digits, +, spaces, hyphens, parens. Strip everything else.
  return input.replace(/[^\d+()\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

export function isValidPhone(input: string): boolean {
  const cleaned = normalizePhone(input);
  return PHONE_ALLOWED.test(cleaned);
}

export function isValidEmail(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  // Conservative RFC-5322-lite check; we just care about typos, not exhaustive correctness.
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed);
}
