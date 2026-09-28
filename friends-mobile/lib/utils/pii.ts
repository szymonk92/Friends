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

/**
 * Mask a phone or email for log lines if you ever need to. Default: drop entirely.
 * Use only when redaction is unavoidable; prefer not logging at all.
 */
export function redact(value: string | null | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
