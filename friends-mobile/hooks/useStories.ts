import { db, getCurrentUserId } from '@/lib/db';
import { stories, type NewStory } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

/**
 * Hook to fetch all stories
 */
export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(stories)
        .where(and(eq(stories.userId, userId), isNull(stories.deletedAt)))
        .orderBy(desc(stories.createdAt));
    },
  });
}

/**
 * Hook to fetch a single story by ID
 */
export function useStory(storyId: string) {
  return useQuery({
    queryKey: ['stories', storyId],
    queryFn: async () => {
      const result = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
      return result[0] || null;
    },
    enabled: !!storyId,
  });
}

/**
 * Hook to create a new story
 */
export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewStory, 'userId'>) => {
      const userId = await getCurrentUserId();
      const result = await db
        .insert(stories)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning();
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

/**
 * Hook to mark story as AI processed
 */
export function useMarkStoryProcessed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, extractedData }: { id: string; extractedData: any }) => {
      const result = await db
        .update(stories)
        .set({
          aiProcessed: true,
          aiProcessedAt: new Date(),
          extractedData: JSON.stringify(extractedData),
          updatedAt: new Date(),
        })
        .where(eq(stories.id, id))
        .returning();
      return result[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories', variables.id] });
    },
  });
}
