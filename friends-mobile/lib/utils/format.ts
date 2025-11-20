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
 * Format a date as a short date string
 */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
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
 * Get emoji for relation type
 */
export function getRelationEmoji(relationType: string): string {
  const emojiMap: Record<string, string> = {
    LIKES: '❤️',
    DISLIKES: '👎',
    KNOWS: '🤝',
    ASSOCIATED_WITH: '🔗',
    EXPERIENCED: '📅',
    HAS_SKILL: '🎯',
    OWNS: '🏠',
    HAS_IMPORTANT_DATE: '🎂',
    IS: '👤',
    BELIEVES: '💭',
    FEARS: '😰',
    WANTS_TO_ACHIEVE: '🎯',
    STRUGGLES_WITH: '😓',
    CARES_FOR: '💖',
    DEPENDS_ON: '🤲',
    REGULARLY_DOES: '🔄',
    PREFERS_OVER: '⚖️',
    USED_TO_BE: '⏮️',
    SENSITIVE_TO: '🚨',
    UNCOMFORTABLE_WITH: '😬',
  };

  return emojiMap[relationType] || '📝';
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
 * Generate a consistent color for person avatars based on name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    '#6200ee', // Purple
    '#03dac6', // Teal
    '#ff5722', // Deep Orange
    '#2196f3', // Blue
    '#4caf50', // Green
    '#ff9800', // Orange
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#8bc34a', // Light Green
    '#f44336', // Red
    '#3f51b5', // Indigo
    '#009688', // Teal
    '#795548', // Brown
    '#607d8b', // Blue Grey
    '#e91e63', // Pink
  ];

  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
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
