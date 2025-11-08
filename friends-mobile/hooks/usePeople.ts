import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { people, type Person, type NewPerson } from '@/lib/db/schema';
import { eq, and, ne, isNull, desc } from 'drizzle-orm';

/**
 * Hook to fetch all people
 */
export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            ne(people.status, 'merged'),
            isNull(people.deletedAt)
          )
        )
        .orderBy(desc(people.updatedAt));
    },
  });
}

/**
 * Hook to fetch a single person by ID
 */
export function usePerson(personId: string) {
  return useQuery({
    queryKey: ['people', personId],
    queryFn: async () => {
      const result = await db
        .select()
        .from(people)
        .where(eq(people.id, personId))
        .limit(1);
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
      const result = await db
        .insert(people)
        .values({
          ...data,
          userId,
          id: crypto.randomUUID(),
        })
        .returning() as any[];
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
      const result = await db
        .update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, id))
        .returning() as any[];
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
      await db
        .update(people)
        .set({ deletedAt: new Date() })
        .where(eq(people.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
