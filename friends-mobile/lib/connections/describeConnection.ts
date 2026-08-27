import type { Connection, Person } from '@/lib/db/schema';

/**
 * Human label for the *other* side of a connection, as seen from `viewerId`'s profile.
 *
 * For a pet link the label is decided by entity type, not column order: the pet
 * endpoint is the pet, the other endpoint is the owner. So on the owner's profile
 * the link reads "Pet · Cat" and on the pet's profile it reads "Owner", no matter
 * which side the row was created from.
 *
 * `child` links still fall back to `person1Id` order (children aren't a distinct
 * entity type), so `person1Id` is treated as the parent side.
 */
export function describeConnection(
  connection: Pick<Connection, 'person1Id' | 'relationshipType' | 'qualifier' | 'status'>,
  connectedEntity: Pick<Person, 'species' | 'entityType'> | null | undefined,
  viewerId: string
): string {
  const qualifier = connection.qualifier ? ` • ${connection.qualifier}` : '';

  if (connection.relationshipType === 'pet') {
    // The connected side is the pet → viewer is the owner; otherwise viewer is the pet.
    if (connectedEntity?.entityType !== 'pet') return 'Owner';
    const species = connectedEntity.species?.trim();
    return species ? `Pet · ${species}` : 'Pet';
  }
  if (connection.relationshipType === 'child') {
    return connection.person1Id === viewerId ? `Child${qualifier}` : 'Parent';
  }

  const status = connection.status && connection.status !== 'active' ? ` • ${connection.status}` : '';
  return `${connection.relationshipType ?? ''}${qualifier}${status}`;
}
