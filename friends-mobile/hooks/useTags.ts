import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { activePeople } from '@/lib/db/filters';
import { parseJsonArray } from '@/lib/utils/json';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';

/**
 * Hook to get all unique tags used across people
 */
export function useAllTags() {
  return useQuery({
    queryKey: ['tags', 'all'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const allPeople = await db
        .select({ tags: people.tags })
        .from(people)
        .where(activePeople(userId));

      const tagSet = new Set<string>();
      allPeople.forEach((p) => {
        parseJsonArray(p.tags).forEach((tag) => tagSet.add(tag));
      });

      return Array.from(tagSet).sort();
    },
  });
}

/**
 * Hook to get tags for a specific person
 */
export function usePersonTags(personId: string) {
  return useQuery({
    queryKey: ['tags', 'person', personId],
    queryFn: async () => {
      const result = await db
        .select({ tags: people.tags })
        .from(people)
        .where(eq(people.id, personId))
        .limit(1);

      return parseJsonArray(result[0]?.tags);
    },
    enabled: !!personId,
  });
}

/**
 * Hook to add a tag to a person
 */
export function useAddTagToPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, tag }: { personId: string; tag: string }) => {
      // Get current tags
      const current = await db
        .select({ tags: people.tags })
        .from(people)
        .where(eq(people.id, personId))
        .limit(1);

      if (!current.length) throw new Error('Person not found');

      let currentTags = parseJsonArray(current[0].tags);

      // Add tag if not already present
      const normalizedTag = tag.trim().toLowerCase();
      if (!currentTags.includes(normalizedTag)) {
        currentTags.push(normalizedTag);
      }

      // Update
      await db
        .update(people)
        .set({
          tags: JSON.stringify(currentTags),
          updatedAt: new Date(),
        })
        .where(eq(people.id, personId));

      return currentTags;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.personId] });
    },
  });
}

/**
 * Hook to remove a tag from a person
 */
export function useRemoveTagFromPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, tag }: { personId: string; tag: string }) => {
      // Get current tags
      const current = await db
        .select({ tags: people.tags })
        .from(people)
        .where(eq(people.id, personId))
        .limit(1);

      if (!current.length) throw new Error('Person not found');

      let currentTags = parseJsonArray(current[0].tags);

      // Remove tag
      const normalizedTag = tag.trim().toLowerCase();
      currentTags = currentTags.filter((t) => t !== normalizedTag);

      // Update
      await db
        .update(people)
        .set({
          tags: JSON.stringify(currentTags),
          updatedAt: new Date(),
        })
        .where(eq(people.id, personId));

      return currentTags;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.personId] });
    },
  });
}

/**
 * Hook to set all tags for a person
 */
export function useSetPersonTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, tags }: { personId: string; tags: string[] }) => {
      const normalizedTags = tags.map((t) => t.trim().toLowerCase());

      await db
        .update(people)
        .set({
          tags: JSON.stringify(normalizedTags),
          updatedAt: new Date(),
        })
        .where(eq(people.id, personId));

      return normalizedTags;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.personId] });
    },
  });
}

/** Helper to parse a person's `tags` JSON column. */
export const parseTags = parseJsonArray;
