import { db, getCurrentUserId } from '@/lib/db';
import { relations, type NewRelation, type Relation } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { relationsLogger, logPerformance } from '@/lib/logger';

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
      relationsLogger.info('Creating relation', {
        subjectId: data.subjectId,
        type: data.relationType,
        object: data.objectLabel,
        source: data.source,
      });

      const userId = await getCurrentUserId();
      const result = (await db
        .insert(relations)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as any[];

      relationsLogger.debug('Relation created', { relationId: result[0]?.id });
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
        id: randomUUID(),
      }));
      const result = (await db.insert(relations).values(values).returning()) as any[];
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
      const result = (await db
        .update(relations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(relations.id, id))
        .returning()) as any[];
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
