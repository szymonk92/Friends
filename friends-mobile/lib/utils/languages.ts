import { parseJsonArray } from './json';

export function parseLanguagesJson(raw: string | null | undefined): string[] {
  return parseJsonArray(raw)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 20);
}

export function serializeLanguages(list: string[]): string | null {
  const cleaned = Array.from(
    new Set(list.map((l) => l.trim()).filter((l) => l.length > 0 && l.length <= 40))
  ).slice(0, 20);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}
