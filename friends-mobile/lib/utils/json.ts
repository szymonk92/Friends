/**
 * Safe parsing for JSON stored in text columns / AsyncStorage.
 * These never throw — malformed data falls back instead of crashing the caller.
 */

/** Parse a JSON array, returning [] for null/invalid/non-array input. */
export function parseJsonArray<T = string>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Parse a JSON object merged over `fallback`. Non-object / invalid input
 * yields `fallback` untouched. Handy for settings blobs with defaults.
 */
export function parseJsonObject<T extends object>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...fallback, ...(parsed as Partial<T>) }
      : fallback;
  } catch {
    return fallback;
  }
}
