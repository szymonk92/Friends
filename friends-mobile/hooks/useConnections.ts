import { db, getCurrentUserId } from '@/lib/db';
import { connections, type NewConnection, type Connection } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

/**
 * Hook to fetch connections for a specific person
 */
export function usePersonConnections(personId: string) {
  return useQuery({
    queryKey: ['connections', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.userId, userId),
            or(eq(connections.person1Id, personId), eq(connections.person2Id, personId)),
            isNull(connections.deletedAt)
          )
        )
        .orderBy(desc(connections.createdAt));
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch all connections
 */
export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      console.log('[useConnections] Fetching connections...');
      const userId = await getCurrentUserId();
      const result = await db
        .select()
        .from(connections)
        .where(and(eq(connections.userId, userId), isNull(connections.deletedAt)))
        .orderBy(desc(connections.createdAt));

      console.log('[useConnections] Fetched connections:', {
        count: result.length,
        sample: result.slice(0, 3).map((c) => ({
          id: c.id,
          person1Id: c.person1Id,
          person2Id: c.person2Id,
        })),
      });

      return result;
    },
  });
}

/**
 * Hook to create a new connection between two people
 */
export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewConnection, 'userId'>) => {
      const userId = await getCurrentUserId();
      const result = (await db
        .insert(connections)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connections', 'person', data.person1Id] });
      queryClient.invalidateQueries({ queryKey: ['connections', 'person', data.person2Id] });
    },
  });
}

/**
 * Hook to update a connection
 */
export function useUpdateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Connection> & { id: string }) => {
      const result = (await db
        .update(connections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(connections.id, id))
        .returning()) as any[];
      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      if (data?.person1Id) {
        queryClient.invalidateQueries({ queryKey: ['connections', 'person', data.person1Id] });
      }
      if (data?.person2Id) {
        queryClient.invalidateQueries({ queryKey: ['connections', 'person', data.person2Id] });
      }
    },
  });
}

/**
 * Hook to delete a connection (soft delete)
 */
export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(connections).set({ deletedAt: new Date() }).where(eq(connections.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}
