import { db, getCurrentUserId } from '@/lib/db';
import { relations, type NewRelation } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

export interface GiftIdea {
  id: string;
  personId: string;
  item: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  priceRange?: string;
  occasion?: string;
  status: 'idea' | 'purchased' | 'given';
  givenDate?: Date;
  createdAt: Date;
}

/**
 * Hook to fetch gift ideas for a specific person
 */
export function usePersonGiftIdeas(personId: string) {
  return useQuery({
    queryKey: ['gifts', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(relations)
        .where(
          and(
            eq(relations.userId, userId),
            eq(relations.subjectId, personId),
            eq(relations.category, 'gift_idea'),
            isNull(relations.deletedAt)
          )
        )
        .orderBy(desc(relations.createdAt));

      // Transform to gift format
      return results.map((r) => {
        const metadata = r.metadata ? JSON.parse(r.metadata) : {};
        return {
          id: r.id,
          personId: r.subjectId,
          item: r.objectLabel,
          notes: metadata.notes,
          priority: metadata.priority || 'medium',
          priceRange: metadata.priceRange,
          occasion: metadata.occasion,
          status: r.status === 'past' ? 'given' : metadata.purchased ? 'purchased' : 'idea',
          givenDate: r.validTo ? new Date(r.validTo) : undefined,
          createdAt: new Date(r.createdAt),
        } as GiftIdea;
      });
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch all gift ideas (across all people)
 */
export function useAllGiftIdeas() {
  return useQuery({
    queryKey: ['gifts', 'all'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(relations)
        .where(
          and(
            eq(relations.userId, userId),
            eq(relations.category, 'gift_idea'),
            isNull(relations.deletedAt)
          )
        )
        .orderBy(desc(relations.createdAt));

      return results.map((r) => {
        const metadata = r.metadata ? JSON.parse(r.metadata) : {};
        return {
          id: r.id,
          personId: r.subjectId,
          item: r.objectLabel,
          notes: metadata.notes,
          priority: metadata.priority || 'medium',
          priceRange: metadata.priceRange,
          occasion: metadata.occasion,
          status: r.status === 'past' ? 'given' : metadata.purchased ? 'purchased' : 'idea',
          givenDate: r.validTo ? new Date(r.validTo) : undefined,
          createdAt: new Date(r.createdAt),
        } as GiftIdea;
      });
    },
  });
}

/**
 * Hook to create a new gift idea
 */
export function useCreateGiftIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      personId: string;
      item: string;
      notes?: string;
      priority?: 'low' | 'medium' | 'high';
      priceRange?: string;
      occasion?: string;
    }) => {
      const userId = await getCurrentUserId();
      const metadata = {
        notes: data.notes,
        priority: data.priority || 'medium',
        priceRange: data.priceRange,
        occasion: data.occasion,
        purchased: false,
      };

      const result = (await db
        .insert(relations)
        .values({
          id: randomUUID(),
          userId,
          subjectId: data.personId,
          relationType: 'WANTS_TO_ACHIEVE', // Using existing type for gifts
          objectLabel: data.item,
          category: 'gift_idea',
          metadata: JSON.stringify(metadata),
          intensity:
            data.priority === 'high' ? 'strong' : data.priority === 'low' ? 'weak' : 'medium',
          confidence: 1.0,
          source: 'manual',
          status: 'current',
        })
        .returning()) as any[];

      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      queryClient.invalidateQueries({ queryKey: ['gifts', 'person', data.subjectId] });
    },
  });
}

/**
 * Hook to update a gift idea (mark as purchased or given)
 */
export function useUpdateGiftIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      purchased,
      given,
      givenDate,
    }: {
      id: string;
      purchased?: boolean;
      given?: boolean;
      givenDate?: Date;
    }) => {
      // First get the current relation to update metadata
      const current = await db.select().from(relations).where(eq(relations.id, id)).limit(1);

      if (!current.length) throw new Error('Gift idea not found');

      const metadata = current[0].metadata ? JSON.parse(current[0].metadata) : {};
      if (purchased !== undefined) metadata.purchased = purchased;

      const updates: any = {
        metadata: JSON.stringify(metadata),
        updatedAt: new Date(),
      };

      if (given) {
        updates.status = 'past';
        updates.validTo = givenDate || new Date();
      }

      const result = (await db
        .update(relations)
        .set(updates)
        .where(eq(relations.id, id))
        .returning()) as any[];

      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
    },
  });
}

/**
 * Hook to delete a gift idea
 */
export function useDeleteGiftIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(relations).set({ deletedAt: new Date() }).where(eq(relations.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
    },
  });
}
