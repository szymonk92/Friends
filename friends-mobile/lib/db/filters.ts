import { and, eq, isNull, ne } from 'drizzle-orm';
import { people } from './schema';

/**
 * The standard "real, visible person" predicate: owned by this user, not
 * soft-deleted, not a merge tombstone. Compose with `and(...)` for extra
 * constraints, e.g. `and(activePeople(userId), eq(people.personType, 'primary'))`.
 */
export const activePeople = (userId: string) =>
  and(eq(people.userId, userId), isNull(people.deletedAt), ne(people.status, 'merged'));
