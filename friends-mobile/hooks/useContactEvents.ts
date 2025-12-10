import { db, getCurrentUserId } from '@/lib/db';
import { contactEvents, type NewContactEvent } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

/**
 * Hook to fetch all contact events (timeline)
 */
export function useContactEvents() {
  return useQuery({
    queryKey: ['contactEvents'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(contactEvents)
        .where(and(eq(contactEvents.userId, userId), isNull(contactEvents.deletedAt)))
        .orderBy(desc(contactEvents.eventDate));
    },
  });
}

/**
 * Hook to fetch contact events for a specific person
 */
export function usePersonContactEvents(personId: string) {
  return useQuery({
    queryKey: ['contactEvents', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(contactEvents)
        .where(
          and(
            eq(contactEvents.userId, userId),
            eq(contactEvents.personId, personId),
            isNull(contactEvents.deletedAt)
          )
        )
        .orderBy(desc(contactEvents.eventDate));
    },
    enabled: !!personId,
  });
}

/**
 * Hook to create a new contact event
 */
export function useCreateContactEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewContactEvent, 'userId'>) => {
      const userId = await getCurrentUserId();
      const result = (await db
        .insert(contactEvents)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contactEvents'] });
      queryClient.invalidateQueries({ queryKey: ['contactEvents', 'person', data.personId] });
    },
  });
}

/**
 * Hook to delete a contact event (soft delete)
 */
export function useDeleteContactEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(contactEvents).set({ deletedAt: new Date() }).where(eq(contactEvents.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactEvents'] });
    },
  });
}

/**
 * Hook to update a contact event
 */
export function useUpdateContactEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<NewContactEvent> & { id: string }) => {
      const result = (await db
        .update(contactEvents)
        .set({ ...data })
        .where(eq(contactEvents.id, id))
        .returning()) as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contactEvents'] });
      if (data?.personId) {
        queryClient.invalidateQueries({ queryKey: ['contactEvents', 'person', data.personId] });
      }
    },
  });
}
