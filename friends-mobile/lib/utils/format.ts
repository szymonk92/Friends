import type { DatePrecision } from '@/lib/utils/dates';
/**
 * Formatting utilities for the Friends app
 */
import { tr, anyRelationLabel, dateLocale } from '@/lib/i18n/labels';

/**
 * Format a date as a relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const plural = (n: number, unit: string) => `${n} ${unit}${n > 1 ? 's' : ''} ago`;
  if (diffYear > 0)
    return tr('time.yearsAgo', plural(diffYear, 'year'), { count: diffYear });
  if (diffMonth > 0)
    return tr('time.monthsAgo', plural(diffMonth, 'month'), { count: diffMonth });
  if (diffWeek > 0)
    return tr('time.weeksAgo', plural(diffWeek, 'week'), { count: diffWeek });
  if (diffDay > 0) return tr('time.daysAgo', plural(diffDay, 'day'), { count: diffDay });
  if (diffHour > 0)
    return tr('time.hoursAgo', plural(diffHour, 'hour'), { count: diffHour });
  if (diffMin > 0)
    return tr('time.minutesAgo', plural(diffMin, 'minute'), { count: diffMin });
  return tr('time.justNow', 'just now');
}

/**
 * Short relative time for list rows — "2d", "1w", "1mo", "1y" (design style).
 */
export function formatRelativeShort(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  const short = (key: string, count: number, suffix: string) =>
    tr(`time.${key}`, `${count}${suffix}`, { count });
  if (diffDay >= 365) return short('shortYear', Math.floor(diffDay / 365), 'y');
  if (diffDay >= 30) return short('shortMonth', Math.floor(diffDay / 30), 'mo');
  if (diffDay >= 7) return short('shortWeek', Math.floor(diffDay / 7), 'w');
  if (diffDay >= 1) return short('shortDay', diffDay, 'd');
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffHr >= 1) return short('shortHour', diffHr, 'h');
  return tr('time.now', 'now');
}

/**
 * Duration since a date, "known X" style — "5y", "8mo", "<1mo".
 */
export function formatYearsKnown(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days >= 365)
    return tr('time.shortYear', `${Math.floor(days / 365)}y`, { count: Math.floor(days / 365) });
  if (days >= 30)
    return tr('time.shortMonth', `${Math.floor(days / 30)}mo`, { count: Math.floor(days / 30) });
  return tr('time.lessThanMonth', '<1mo');
}

/**
 * Format a date as a short date string
 */
/** formatShortDate that omits parts the user never gave (null precision = exact day). */
export function formatFlexibleDate(date: Date, precision: DatePrecision | null): string {
  if (!precision || precision === 'day') return formatShortDate(date);
  return new Intl.DateTimeFormat(dateLocale(), {
    month: precision === 'month' ? 'short' : undefined,
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format relation type for display
 */
export function formatRelationType(relationType: string): string {
  return anyRelationLabel(relationType);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  // Spread to iterate by code point so emoji/accents aren't sliced mid-surrogate.
  const firstChars = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => [...word][0]);
  const letters = firstChars.filter((ch) => /[\p{L}\p{N}]/u.test(ch));
  return (letters.length ? letters : firstChars).slice(0, 2).join('').toUpperCase();
}

/** Lowercase + strip accents for search matching; ł has no decomposition so map it by hand. */
export function foldText(v: string): string {
  return v
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
