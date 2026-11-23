import { db, getCurrentUserId } from '@/lib/db';
import { connections, people, type NewConnection, type Connection } from '@/lib/db/schema';
import { activePeople } from '@/lib/db/filters';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

/** Both endpoints still exist (rows from before delete-cascade was added may point at deleted people). */
const bothActive = (userId: string) => {
  const alive = db.select({ id: people.id }).from(people).where(activePeople(userId));
  return and(inArray(connections.person1Id, alive), inArray(connections.person2Id, alive));
};

/**
 * Hook to fetch connections for a specific person
 */
export function usePersonConnections(personId: string) {
  return useQuery({
    queryKey: ['connections', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const rows = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.userId, userId),
            or(eq(connections.person1Id, personId), eq(connections.person2Id, personId)),
            isNull(connections.deletedAt),
            bothActive(userId)
          )
        )
        .orderBy(desc(connections.createdAt));
      // Partner always comes first; everything else keeps createdAt order.
      return rows.sort(
        (a, b) =>
          Number(b.relationshipType === 'partner') - Number(a.relationshipType === 'partner')
      );
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
      const userId = await getCurrentUserId();
      const result = await db
        .select()
        .from(connections)
        .where(and(eq(connections.userId, userId), isNull(connections.deletedAt), bothActive(userId)))
        .orderBy(desc(connections.createdAt));


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
