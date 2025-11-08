import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { relations, type Relation, type NewRelation } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

/**
 * Hook to fetch relations for a specific person
 */
export function usePersonRelations(personId: string) {
  return useQuery({
    queryKey: ['relations', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(relations)
        .where(
          and(
            eq(relations.userId, userId),
            eq(relations.subjectId, personId),
            isNull(relations.deletedAt)
          )
        )
        .orderBy(desc(relations.createdAt));
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch all relations
 */
export function useRelations() {
  return useQuery({
    queryKey: ['relations'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(relations)
        .where(and(eq(relations.userId, userId), isNull(relations.deletedAt)))
        .orderBy(desc(relations.createdAt));
    },
  });
}

/**
 * Hook to create a new relation
 */
export function useCreateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewRelation, 'userId'>) => {
      const userId = await getCurrentUserId();
      const result = await db
        .insert(relations)
        .values({
          ...data,
          userId,
          id: crypto.randomUUID(),
        })
        .returning() as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      queryClient.invalidateQueries({ queryKey: ['relations', 'person', data.subjectId] });
    },
  });
}

/**
 * Hook to create multiple relations at once (bulk insert)
 */
export function useCreateRelations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataList: Array<Omit<NewRelation, 'userId'>>) => {
      const userId = await getCurrentUserId();
      const values = dataList.map((data) => ({
        ...data,
        userId,
        id: crypto.randomUUID(),
      }));
      const result = await db.insert(relations).values(values).returning() as any[];
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
  });
}

/**
 * Hook to update a relation
 */
export function useUpdateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Relation> & { id: string }) => {
      const result = await db
        .update(relations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(relations.id, id))
        .returning() as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      if (data?.subjectId) {
        queryClient.invalidateQueries({ queryKey: ['relations', 'person', data.subjectId] });
      }
    },
  });
}

/**
 * Hook to delete a relation (soft delete)
 */
export function useDeleteRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(relations).set({ deletedAt: new Date() }).where(eq(relations.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
  });
}
