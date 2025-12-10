/**
 * Constants for relation types used in UI components
 * These map the enum values to display labels and icons
 */

/**
 * All allowed relation types for database validation
 */
export const ALLOWED_RELATION_TYPES = [
  'KNOWS',
  'LIKES',
  'DISLIKES',
  'UNKNOWN',
  'ASSOCIATED_WITH',
  'EXPERIENCED',
  'HAS_SKILL',
  'OWNS',
  'HAS_IMPORTANT_DATE',
  'IS',
  'BELIEVES',
  'FEARS',
  'WANTS_TO_ACHIEVE',
  'STRUGGLES_WITH',
  'CARES_FOR',
  'DEPENDS_ON',
  'REGULARLY_DOES',
  'PREFERS_OVER',
  'USED_TO_BE',
  'SENSITIVE_TO',
  'UNCOMFORTABLE_WITH',
] as const;

export const RELATION_TYPE_OPTIONS = [
  { label: 'Likes', value: 'LIKES' as const, icon: 'heart' },
  { label: 'Dislikes', value: 'DISLIKES' as const, icon: 'heart-broken' },
  { label: 'Is', value: 'IS' as const, icon: 'account' },
  { label: 'Knows', value: 'KNOWS' as const, icon: 'handshake' },
  { label: 'Has Skill', value: 'HAS_SKILL' as const, icon: 'tools' },
  { label: 'Fears', value: 'FEARS' as const, icon: 'alert' },
  { label: 'Regularly Does', value: 'REGULARLY_DOES' as const, icon: 'repeat' },
  { label: 'Wants To Achieve', value: 'WANTS_TO_ACHIEVE' as const, icon: 'target' },
  { label: 'Struggles With', value: 'STRUGGLES_WITH' as const, icon: 'emoticon-sad' },
  { label: 'Cares For', value: 'CARES_FOR' as const, icon: 'heart-circle' },
] as const;

/**
 * Constants for intensity options used in UI components
 * These map the enum values to display labels
 */
export const INTENSITY_OPTIONS = [
  { label: 'Weak', value: 'weak' as const },
  { label: 'Medium', value: 'medium' as const },
  { label: 'Strong', value: 'strong' as const },
  { label: 'Very Strong', value: 'very_strong' as const },
] as const;

// Type helpers to ensure type safety
export type RelationTypeOption = (typeof RELATION_TYPE_OPTIONS)[number];
export type IntensityOption = (typeof INTENSITY_OPTIONS)[number];

// Common relation types for frequent use
export const LIKES = 'LIKES' as const;
export const DISLIKES = 'DISLIKES' as const;
export const HAS_SKILL = 'HAS_SKILL' as const;
export const REGULARLY_DOES = 'REGULARLY_DOES' as const;
export const PREFERS_OVER = 'PREFERS_OVER' as const;
export const FEARS = 'FEARS' as const;
export const WANTS_TO_ACHIEVE = 'WANTS_TO_ACHIEVE' as const;
export const HAS_IMPORTANT_DATE = 'HAS_IMPORTANT_DATE' as const;

// Common intensity values for frequent use
export const WEAK = 'weak' as const;
export const MEDIUM = 'medium' as const;
export const STRONG = 'strong' as const;
export const VERY_STRONG = 'very_strong' as const;

/**
 * Constants for relationship types used in connection management
 * These define the types of relationships between people
 */
export const RELATIONSHIP_TYPES = [
  { label: 'Friend', value: 'friend', icon: 'account-heart' },
  { label: 'Family', value: 'family', icon: 'home-heart' },
  { label: 'Colleague', value: 'colleague', icon: 'briefcase' },
  { label: 'Partner', value: 'partner', icon: 'heart' },
  { label: 'Acquaintance', value: 'acquaintance', icon: 'account' },
] as const;

/**
 * Constants for connection statuses used in connection management
 * These define the current state of relationships between people
 */
export const CONNECTION_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Ended', value: 'ended' },
  { label: 'Complicated', value: 'complicated' },
];
