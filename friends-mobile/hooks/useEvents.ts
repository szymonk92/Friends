import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { events, type NewEvent, type Event } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

/**
 * Hook to fetch all events (parties, gatherings, etc.)
 */
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(events)
        .where(and(eq(events.userId, userId), isNull(events.deletedAt)))
        .orderBy(desc(events.eventDate)) as Promise<Event[]>;
    },
  });
}

/**
 * Hook to fetch upcoming events
 */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const now = new Date();
      const allEvents = (await db
        .select()
        .from(events)
        .where(and(eq(events.userId, userId), isNull(events.deletedAt)))
        .orderBy(desc(events.eventDate))) as Event[];

      return allEvents.filter(
        (event) =>
          event.eventDate &&
          new Date(event.eventDate) >= now &&
          event.status !== 'completed' &&
          event.status !== 'cancelled'
      );
    },
  });
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      const results = (await db.select().from(events).where(eq(events.id, eventId))) as Event[];
      return results[0] || null;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to create a new event (party/gathering)
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewEvent, 'userId' | 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = await getCurrentUserId();
      const result = (await db
        .insert(events)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as Event[];
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<NewEvent> & { id: string }) => {
      const result = (await db
        .update(events)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(events.id, id))
        .returning()) as Event[];
      return result[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
    },
  });
}

/**
 * Hook to delete an event (soft delete)
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
