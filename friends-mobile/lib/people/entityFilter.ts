/**
 * Which `people.entity_type` a people query should be constrained to.
 *
 * Pets share the `people` table but are opt-in: callers that don't ask get
 * people only, so pets never leak into the People tabs, counts, quizzes, or
 * party mode. Pass `'all'` to include both (used for connection lookups).
 */
export type EntityTypeFilter = 'person' | 'pet' | 'all';

export function entityConstraintFor(filter?: EntityTypeFilter): 'person' | 'pet' | null {
  if (filter === 'all') return null;
  if (filter === 'pet') return 'pet';
  return 'person';
}
