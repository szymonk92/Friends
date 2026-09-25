/**
 * Constants for relation types used in UI components
 * These map the enum values to display labels and icons
 */

/**
 * All allowed relation types for database validation.
 * 12 story-fact types the AI/manual picker use, plus HAS_IMPORTANT_DATE —
 * ponytail: reserved for the dedicated birthday/anniversary feature
 * (PersonImportantDates), kept out of the AI vocabulary and manual picker.
 */
export const ALLOWED_RELATION_TYPES = [
  'DOES',
  'AVOIDS',
  'LIKES',
  'DISLIKES',
  'HAS',
  'LIVES_IN',
  'IS',
  'CAN',
  'DID',
  'STRUGGLES_WITH',
  'WANTS',
  'KNOWS',
  'HAS_IMPORTANT_DATE',
] as const;

export const RELATION_TYPE_OPTIONS = [
  { label: 'Likes', value: 'LIKES' as const, icon: 'heart' },
  { label: 'Dislikes', value: 'DISLIKES' as const, icon: 'heart-broken' },
  { label: 'Avoids', value: 'AVOIDS' as const, icon: 'shield-alert' },
  { label: 'Is', value: 'IS' as const, icon: 'account' },
  { label: 'Has', value: 'HAS' as const, icon: 'bag-personal' },
  { label: 'Lives In', value: 'LIVES_IN' as const, icon: 'map-marker' },
  { label: 'Can', value: 'CAN' as const, icon: 'tools' },
  { label: 'Does', value: 'DOES' as const, icon: 'repeat' },
  { label: 'Did', value: 'DID' as const, icon: 'calendar-check' },
  { label: 'Wants', value: 'WANTS' as const, icon: 'target' },
  { label: 'Struggles With', value: 'STRUGGLES_WITH' as const, icon: 'emoticon-sad' },
  { label: 'Knows', value: 'KNOWS' as const, icon: 'handshake' },
] as const;

/**
 * Constants for intensity options used in UI components
 * These map the enum values to display labels
 */
export const INTENSITY_OPTIONS = [
  { label: 'Weak', value: 'weak' as const },
  { label: 'Medium', value: 'medium' as const },
  { label: 'Strong', value: 'strong' as const },
] as const;

/**
 * Relation types where "weak/strong" has no meaning — HAS, LIVES_IN, and
 * KNOWS are true/false facts, not a spectrum. The form hides the intensity
 * picker for these; when/current-vs-past is what STATUS_OPTIONS is for.
 */
export const TYPES_WITHOUT_INTENSITY: readonly string[] = ['HAS', 'LIVES_IN', 'KNOWS'];

/**
 * When a relation held true — orthogonal to intensity. "Lives in Sicily"
 * vs "used to live in Sicily" is a status change, not a strength change.
 */
export const STATUS_OPTIONS = [
  { label: 'Current', value: 'current' as const },
  { label: 'Past', value: 'past' as const },
  { label: 'Future', value: 'future' as const },
  { label: 'Aspiration', value: 'aspiration' as const },
] as const;

// Type helpers to ensure type safety
export type RelationTypeOption = (typeof RELATION_TYPE_OPTIONS)[number];
export type IntensityOption = (typeof INTENSITY_OPTIONS)[number];
export type StatusOption = (typeof STATUS_OPTIONS)[number];

// Common relation types for frequent use
export const LIKES = 'LIKES' as const;
export const DISLIKES = 'DISLIKES' as const;
export const AVOIDS = 'AVOIDS' as const;
export const CAN = 'CAN' as const;
export const DOES = 'DOES' as const;
export const WANTS = 'WANTS' as const;
export const HAS_IMPORTANT_DATE = 'HAS_IMPORTANT_DATE' as const;

// Common intensity values for frequent use
export const WEAK = 'weak' as const;
export const MEDIUM = 'medium' as const;
export const STRONG = 'strong' as const;

/**
 * Direct preference contradictions — the one conflict a local check can catch
 * that the AI flow can't (manual entry has no model in the loop). Someone can't
 * simultaneously like AND dislike/avoid the same thing.
 *
 * "Used to like X, now dislikes" is a status change (old → 'past'), not a
 * contradiction, so past relations are skipped.
 * ponytail: ingredient/dietary conflicts stay AI-side — the extraction prompt
 * already makes the model detect them, and a hand-rolled food DB can't compete.
 */
const OPPOSITES: Record<string, readonly string[]> = {
  LIKES: ['DISLIKES', 'AVOIDS'],
  DISLIKES: ['LIKES'],
  AVOIDS: ['LIKES'],
};

export function findDirectContradiction(
  newRelationType: string,
  newObjectLabel: string,
  existing: ReadonlyArray<{
    relationType: string;
    objectLabel: string;
    status?: string | null;
  }>
): string | null {
  const opposites = OPPOSITES[newRelationType];
  if (!opposites) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  const target = norm(newObjectLabel);
  for (const r of existing) {
    if (r.status === 'past') continue;
    if (opposites.includes(r.relationType) && norm(r.objectLabel) === target) {
      return `Already ${r.relationType.toLowerCase()} "${newObjectLabel}" for this person. Edit or archive that entry instead of adding a contradictory one.`;
    }
  }
  return null;
}

/**
 * Constants for relationship types used in connection management
 * These define the types of relationships between people
 */
export const RELATIONSHIP_TYPES = [
  { label: 'Friend', value: 'friend', icon: 'account-heart' },
  { label: 'Family', value: 'family', icon: 'home-heart' },
  { label: 'Colleague', value: 'colleague', icon: 'briefcase' },
  { label: 'Partner', value: 'partner', icon: 'heart' },
  { label: 'Ex-Partner', value: 'ex-partner', icon: 'heart-broken' },
  { label: 'Acquaintance', value: 'acquaintance', icon: 'account' },
  { label: 'Parent', value: 'parent', icon: 'account-child' },
  { label: 'Child', value: 'child', icon: 'baby-face-outline' },
  { label: 'Sibling', value: 'sibling', icon: 'account-multiple' },
] as const;

// Picker layout: `family` is a wrapper — Parent/Child/Sibling only appear once it's chosen.
export const FAMILY_SUBTYPE_VALUES = ['parent', 'child', 'sibling'] as const;
export const RELATIONSHIP_TOP_LEVEL = RELATIONSHIP_TYPES.filter(
  (t) => !(FAMILY_SUBTYPE_VALUES as readonly string[]).includes(t.value)
);
export const FAMILY_SUBTYPES = RELATIONSHIP_TYPES.filter((t) =>
  (FAMILY_SUBTYPE_VALUES as readonly string[]).includes(t.value)
);

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
