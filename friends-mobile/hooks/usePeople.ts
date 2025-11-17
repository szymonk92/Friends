import { db, getCurrentUserId } from '@/lib/db';
import { people, files, type NewPerson, type Person } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

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
      const userId = await getCurrentUserId();

      // First get all people
      const peopleResults = await db
        .select()
        .from(people)
        .where(
          and(eq(people.userId, userId), ne(people.status, 'merged'), isNull(people.deletedAt))
        )
        .orderBy(desc(people.updatedAt));

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
        } catch (error) {
          // Files table might not exist yet, ignore
          console.warn('Failed to fetch photo paths:', error);
        }
      }

      // Combine results
      return peopleResults.map((person) => ({
        ...person,
        photoPath: person.photoId ? photoMap[person.photoId] || null : null,
      }));
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
 * Hook to create a new person
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewPerson, 'userId'>) => {
      const userId = await getCurrentUserId();

      // Check for duplicate name
      if (data.name && (await checkNameExists(userId, data.name))) {
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
      // Check for duplicate name if name is being updated
      if (data.name) {
        const userId = await getCurrentUserId();
        if (await checkNameExists(userId, data.name, id)) {
          throw new Error(`A person named "${data.name}" already exists`);
        }
      }

      const result = (await db
        .update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, id))
        .returning()) as any[];
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
      await db.update(people).set({ deletedAt: new Date() }).where(eq(people.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
