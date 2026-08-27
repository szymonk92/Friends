import type { Connection, Person } from '@/lib/db/schema';

/**
 * Human label for the *other* side of a connection, as seen from `viewerId`'s profile.
 *
 * Connections are directional: `person1Id` is the side the connection was created
 * from — for pet/child links that's the owner/parent, `person2Id` is the pet/child.
 * So the label has to flip depending on which profile you're viewing it from:
 * on Darek's profile the Cheetos link reads "🐾 Cat"; on Cheetos' profile the
 * same link reads "Owner".
 */
export function describeConnection(
  connection: Pick<Connection, 'person1Id' | 'relationshipType' | 'qualifier' | 'status'>,
  connectedEntity: Pick<Person, 'species'> | null | undefined,
  viewerId: string
): string {
  const viewingFromOwnerSide = connection.person1Id === viewerId;
  const qualifier = connection.qualifier ? ` • ${connection.qualifier}` : '';

  if (connection.relationshipType === 'pet') {
    if (!viewingFromOwnerSide) return 'Owner';
    const species = connectedEntity?.species?.trim();
    return species ? `Pet · ${species}` : 'Pet';
  }
  if (connection.relationshipType === 'child') {
    return viewingFromOwnerSide ? `Child${qualifier}` : 'Parent';
  }

  const status = connection.status && connection.status !== 'active' ? ` • ${connection.status}` : '';
  return `${connection.relationshipType ?? ''}${qualifier}${status}`;
}
