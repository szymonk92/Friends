/**
 * Formatting utilities for the Friends app
 */

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

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Short relative time for list rows — "2d", "1w", "1mo", "1y" (design style).
 */
export function formatRelativeShort(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay >= 365) return `${Math.floor(diffDay / 365)}y`;
  if (diffDay >= 30) return `${Math.floor(diffDay / 30)}mo`;
  if (diffDay >= 7) return `${Math.floor(diffDay / 7)}w`;
  if (diffDay >= 1) return `${diffDay}d`;
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffHr >= 1) return `${diffHr}h`;
  return 'now';
}

/**
 * Duration since a date, "known X" style — "5y", "8mo", "<1mo".
 */
export function formatYearsKnown(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days >= 365) return `${Math.floor(days / 365)}y`;
  if (days >= 30) return `${Math.floor(days / 30)}mo`;
  return '<1mo';
}

/**
 * Format a date as a short date string
 */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format relation type for display
 */
export function formatRelationType(relationType: string): string {
  return relationType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format importance level for display
 */
export function formatImportance(importance: string): string {
  const labels: Record<string, string> = {
    unknown: 'Unknown',
    peripheral: 'Peripheral',
    important: 'Important',
    very_important: 'Very Important',
  };
  return labels[importance] || importance;
}

/**
 * Get color for importance level
 */
export function getImportanceColor(importance: string): string {
  const colors: Record<string, string> = {
    unknown: '#9E9E9E',
    peripheral: '#2196F3',
    important: '#FF9800',
    very_important: '#F44336',
  };
  return colors[importance] || '#9E9E9E';
}

/**
 * Get color for relationship type (used for connection avatars)
 */
export function getRelationshipColor(relationshipType: string): string {
  const defaultColors: Record<string, string> = {
    friend: '#4CAF50',
    family: '#E91E63',
    colleague: '#2196F3',
    acquaintance: '#9E9E9E',
    partner: '#F44336',
  };

  return defaultColors[relationshipType] || '#6200ee'; // Default to purple if unknown
}
