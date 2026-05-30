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
