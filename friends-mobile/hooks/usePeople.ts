import { db, getCurrentUserId } from '@/lib/db';
import { people, files, type NewPerson, type Person } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { peopleLogger, logPerformance } from '@/lib/logger';

/**
 * Check if a person name already exists (case-insensitive)
 */
async function checkNameExists(
  userId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const normalizedName = name.trim().toLowerCase();
  const existingPeople = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        sql`lower(${people.name}) = ${normalizedName}`,
        isNull(people.deletedAt),
        ne(people.status, 'merged'),
        excludeId ? ne(people.id, excludeId) : sql`1=1`
      )
    )
    .limit(1);
  return existingPeople.length > 0;
}

/**
 * Hook to fetch all people
 */
export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const perf = logPerformance(peopleLogger, 'fetchAllPeople');
      const userId = await getCurrentUserId();
      peopleLogger.debug('Fetching people', { userId });

      // First get all people (excluding 'self' type which is the user themselves)
      const peopleResults = await db
        .select()
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            ne(people.status, 'merged'),
            isNull(people.deletedAt),
            ne(people.personType, 'self')
          )
        )
        .orderBy(desc(people.updatedAt));

      peopleLogger.info('People fetched', { count: peopleResults.length });

      // Then try to get photo paths for people with photoId
      const photoIds = peopleResults
        .filter((p) => p.photoId)
        .map((p) => p.photoId as string);

      let photoMap: Record<string, string> = {};
      if (photoIds.length > 0) {
        try {
          const photosResults = await db
            .select({ id: files.id, filePath: files.filePath })
            .from(files)
            .where(sql`${files.id} IN (${sql.join(photoIds.map((id) => sql`${id}`), sql`, `)})`);

          for (const photo of photosResults) {
            photoMap[photo.id] = photo.filePath;
          }
          peopleLogger.debug('Photos loaded', { count: photosResults.length });
        } catch (error) {
          // Files table might not exist yet, ignore
          peopleLogger.warn('Failed to fetch photo paths', { error });
        }
      }

      // Combine results
      const result = peopleResults.map((person) => ({
        ...person,
        photoPath: person.photoId ? photoMap[person.photoId] || null : null,
      }));

      perf.end(true, { peopleCount: result.length });
      return result;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });
}

/**
 * Hook to fetch a single person by ID
 */
export function usePerson(personId: string) {
  return useQuery({
    queryKey: ['people', personId],
    queryFn: async () => {
      const result = await db.select().from(people).where(eq(people.id, personId)).limit(1);
      return result[0] || null;
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch the "ME" person (user themselves) for self-relations
 */
export function useMePerson() {
  return useQuery({
    queryKey: ['people', 'me'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const result = await db
        .select()
        .from(people)
        .where(and(eq(people.userId, userId), eq(people.personType, 'self')))
        .limit(1);
      return result[0] || null;
    },
  });
}

/**
 * Hook to create a new person
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewPerson, 'userId'>) => {
      const perf = logPerformance(peopleLogger, 'createPerson');
      const userId = await getCurrentUserId();
      peopleLogger.info('Creating person', { name: data.name, type: data.personType });

      // Check for duplicate name
      if (data.name && (await checkNameExists(userId, data.name))) {
        peopleLogger.warn('Duplicate person name', { name: data.name });
        throw new Error(`A person named "${data.name}" already exists`);
      }

      const result = (await db
        .insert(people)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as any[];

      perf.end(true, { personId: result[0]?.id, name: data.name });
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

/**
 * Hook to update a person
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Person> & { id: string }) => {
      const perf = logPerformance(peopleLogger, 'updatePerson');
      peopleLogger.info('Updating person', { personId: id, fields: Object.keys(data) });

      // Check for duplicate name if name is being updated
      if (data.name) {
        const userId = await getCurrentUserId();
        if (await checkNameExists(userId, data.name, id)) {
          peopleLogger.warn('Duplicate person name on update', { name: data.name });
          throw new Error(`A person named "${data.name}" already exists`);
        }
      }

      const result = (await db
        .update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, id))
        .returning()) as any[];

      perf.end(true, { personId: id });
      return result[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.id] });
    },
  });
}

/**
 * Hook to delete a person (soft delete)
 */
export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      peopleLogger.info('Deleting person (soft)', { personId: id });
      await db.update(people).set({ deletedAt: new Date() }).where(eq(people.id, id));
      peopleLogger.info('Person deleted', { personId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
