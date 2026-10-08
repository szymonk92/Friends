/**
 * Parses flexible date strings used across forms in the app.
 *
 *   "1990"        -> 1990-01-01
 *   "1990-06"     -> 1990-06-01
 *   "1990-06-15"  -> 1990-06-15
 *   anything else -> null
 *
 * Year must be 1900..2100 to weed out typos like "20" or "1".
 */
export function parseFlexibleDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('-').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
    return new Date(parts[0], 0, 1);
  }
  if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
    return new Date(parts[0], parts[1] - 1, 1);
  }
  if (
    parts.length === 3 &&
    parts[0] >= 1900 && parts[0] <= 2100 &&
    parts[1] >= 1 && parts[1] <= 12 &&
    parts[2] >= 1 && parts[2] <= 31
  ) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    // Reject phantom dates like 2024-02-30 (which JS would otherwise roll into March)
    if (
      date.getFullYear() === parts[0] &&
      date.getMonth() === parts[1] - 1 &&
      date.getDate() === parts[2]
    ) {
      return date;
    }
  }
  return null;
}

/** Inverse of parseFlexibleDate for a full date: "2014-06-05". */
export function toDateText(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export type DatePrecision = 'day' | 'month' | 'year';

/**
 * Builds the flexible date string for a picker selection. Missing month/day
 * default to today's month / today (if in the current month) else the 1st;
 * day is clamped to the month's length (Jan 31 → Feb 29).
 */
export function flexibleDateText(
  year: number,
  month: number | null,
  day: number | null,
  precision: DatePrecision,
  now: Date = new Date()
): string {
  if (precision === 'year') return String(year);
  const mm = month ?? now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (precision === 'month') return `${year}-${pad(mm)}`;
  const isNowMonth = year === now.getFullYear() && mm === now.getMonth() + 1;
  const dd = Math.min(day ?? (isNowMonth ? now.getDate() : 1), new Date(year, mm, 0).getDate());
  return `${year}-${pad(mm)}-${pad(dd)}`;
}
