import { tr, relationTypeLabel } from '@/lib/i18n/labels';

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
      return tr(
        'errors.contradiction',
        `Already ${r.relationType.toLowerCase()} "${newObjectLabel}" for this person. Edit or archive that entry instead of adding a contradictory one.`,
        { type: relationTypeLabel(r.relationType).toLowerCase(), item: newObjectLabel }
      );
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
/** Relationships that always make someone a primary contact (personType picker hidden). */
export const ALWAYS_PRIMARY_RELATIONSHIPS: readonly string[] = [
  'partner',
  'ex-partner',
  'friend',
  'family',
];

export const CONNECTION_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Ended', value: 'ended' },
  { label: 'Complicated', value: 'complicated' },
];

/**
 * One-tap diet/drink chips on the edit-person screen. Each chip is just a
 * normal relation with a fixed label, so filters, party planning and the AI
 * conflict check all see the same canonical string.
 */
export const DIET_PRESETS = [
  { key: 'vegetarian', relationType: 'IS', objectLabel: 'vegetarian' },
  { key: 'vegan', relationType: 'IS', objectLabel: 'vegan' },
  { key: 'lactoseIntolerant', relationType: 'IS', objectLabel: 'lactose intolerant' },
  { key: 'glutenFree', relationType: 'AVOIDS', objectLabel: 'gluten' },
  { key: 'noAlcohol', relationType: 'AVOIDS', objectLabel: 'alcohol' },
] as const;

export type DietKey = (typeof DIET_PRESETS)[number]['key'];

type DietRow = { id: string; relationType: string; objectLabel: string; status?: string | null };

const matchesPreset = (r: DietRow, p: (typeof DIET_PRESETS)[number]) =>
  r.relationType === p.relationType &&
  r.objectLabel.trim().toLowerCase() === p.objectLabel &&
  (r.status ?? 'current') === 'current';

/**
 * Relation label for display: diet presets are stored in English (canonical),
 * so show the translated chip name instead; anything else is user text as-is.
 */
export function displayObjectLabel(relationType: string, objectLabel: string): string {
  const preset = DIET_PRESETS.find(
    (p) => p.relationType === relationType && p.objectLabel === objectLabel.trim().toLowerCase()
  );
  return preset ? tr(`person.diet.${preset.key}`, objectLabel) : objectLabel;
}

/** Diet chips that are already "on" for this person. */
export function activeDietKeys(rows: readonly DietRow[]): DietKey[] {
  return DIET_PRESETS.filter((p) => rows.some((r) => matchesPreset(r, p))).map((p) => p.key);
}

/**
 * What to write when the chips go from `before` to `after`. Only chips the
 * user actually toggled are touched — never deletes a relation it didn't show.
 */
export function dietChanges(
  before: readonly DietKey[],
  after: readonly DietKey[],
  rows: readonly DietRow[]
) {
  const toCreate = DIET_PRESETS.filter((p) => after.includes(p.key) && !before.includes(p.key));
  const removed = DIET_PRESETS.filter((p) => before.includes(p.key) && !after.includes(p.key));
  const toDeleteIds = rows.filter((r) => removed.some((p) => matchesPreset(r, p))).map((r) => r.id);
  return { toCreate, toDeleteIds };
}
