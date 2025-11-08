import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { pendingExtractions, relations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Hook to get all pending extractions for the current user
 */
export function usePendingExtractions() {
  return useQuery({
    queryKey: ['pending-extractions'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(pendingExtractions)
        .where(
          and(
            eq(pendingExtractions.userId, userId),
            eq(pendingExtractions.reviewStatus, 'pending')
          )
        )
        .orderBy(pendingExtractions.confidence); // Low confidence first (needs most attention)

      return results;
    },
  });
}

/**
 * Hook to get pending extractions for a specific person
 */
export function usePendingExtractionsForPerson(personId: string) {
  return useQuery({
    queryKey: ['pending-extractions', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(pendingExtractions)
        .where(
          and(
            eq(pendingExtractions.userId, userId),
            eq(pendingExtractions.subjectId, personId),
            eq(pendingExtractions.reviewStatus, 'pending')
          )
        );

      return results;
    },
  });
}

/**
 * Hook to approve a pending extraction (convert it to a relation)
 */
export function useApprovePendingExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (extractionId: string) => {
      // Get the pending extraction
      const [extraction] = await db
        .select()
        .from(pendingExtractions)
        .where(eq(pendingExtractions.id, extractionId))
        .limit(1);

      if (!extraction) {
        throw new Error('Pending extraction not found');
      }

      // Create the relation
      const [newRelation] = (await db
        .insert(relations)
        .values({
          userId: extraction.userId,
          subjectId: extraction.subjectId,
          subjectType: 'person',
          relationType: extraction.relationType as any,
          objectLabel: extraction.objectLabel,
          objectType: extraction.objectType || undefined,
          intensity: extraction.intensity as any,
          confidence: extraction.confidence,
          category: extraction.category || undefined,
          metadata: extraction.metadata || undefined,
          status: extraction.status as any,
          source: 'ai_extraction',
        })
        .returning()) as any[];

      // Mark the extraction as approved
      await db
        .update(pendingExtractions)
        .set({
          reviewStatus: 'approved',
          reviewedAt: new Date(),
        })
        .where(eq(pendingExtractions.id, extractionId));

      return newRelation;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['pending-extractions'] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      queryClient.invalidateQueries({ queryKey: ['relations', 'person', data.subjectId] });
    },
  });
}

/**
 * Hook to reject a pending extraction
 */
export function useRejectPendingExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ extractionId, reason }: { extractionId: string; reason?: string }) => {
      await db
        .update(pendingExtractions)
        .set({
          reviewStatus: 'rejected',
          reviewedAt: new Date(),
          reviewNotes: reason || null,
        })
        .where(eq(pendingExtractions.id, extractionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-extractions'] });
    },
  });
}

/**
 * Hook to edit and approve a pending extraction
 */
export function useEditAndApprovePendingExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      extractionId,
      updates,
    }: {
      extractionId: string;
      updates: {
        relationType?: string;
        objectLabel?: string;
        intensity?: string;
        category?: string;
      };
    }) => {
      // Get the pending extraction
      const [extraction] = await db
        .select()
        .from(pendingExtractions)
        .where(eq(pendingExtractions.id, extractionId))
        .limit(1);

      if (!extraction) {
        throw new Error('Pending extraction not found');
      }

      // Create the relation with edited values
      const [newRelation] = (await db
        .insert(relations)
        .values({
          userId: extraction.userId,
          subjectId: extraction.subjectId,
          subjectType: 'person',
          relationType: (updates.relationType || extraction.relationType) as any,
          objectLabel: updates.objectLabel || extraction.objectLabel,
          objectType: extraction.objectType || undefined,
          intensity: (updates.intensity || extraction.intensity) as any,
          confidence: 1.0, // User edited, so 100% confident
          category: updates.category || extraction.category || undefined,
          metadata: extraction.metadata || undefined,
          status: extraction.status as any,
          source: 'ai_extraction',
        })
        .returning()) as any[];

      // Mark the extraction as edited and approved
      await db
        .update(pendingExtractions)
        .set({
          reviewStatus: 'edited',
          reviewedAt: new Date(),
          reviewNotes: 'User edited before approving',
        })
        .where(eq(pendingExtractions.id, extractionId));

      return newRelation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-extractions'] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      queryClient.invalidateQueries({ queryKey: ['relations', 'person', data.subjectId] });
    },
  });
}

/**
 * Hook to get count of pending extractions
 */
export function usePendingExtractionsCount() {
  return useQuery({
    queryKey: ['pending-extractions', 'count'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(pendingExtractions)
        .where(
          and(
            eq(pendingExtractions.userId, userId),
            eq(pendingExtractions.reviewStatus, 'pending')
          )
        );

      return results.length;
    },
  });
}
