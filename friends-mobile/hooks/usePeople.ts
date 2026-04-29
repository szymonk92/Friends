import { db, getCurrentUserId } from '@/lib/db';
import { people, files, events, type NewPerson, type Person } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { peopleLogger, logPerformance } from '@/lib/logger';
import { COUNTRIES } from '@/lib/data/countries';

/**
 * Extended Person type that includes photoPath from file system
 */
export type PersonWithPhoto = Person & {
  photoPath: string | null;
};

/**
 * Check if a person name already exists (case-insensitive)
 */
async function checkNameExists(userId: string, name: string, excludeId?: string): Promise<boolean> {
  const normalizedName = name.trim().toLowerCase();
  const existingPeople = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        sql`lower(${people.name}) = ${normalizedName}`,
        isNull(people.deletedAt),
        ne(people.status, 'merged'),
        excludeId ? ne(people.id, excludeId) : sql`1=1`
      )
    )
    .limit(1);
  return existingPeople.length > 0;
}

/**
 * Hook to fetch all people
 */
export function usePeople(filter?: { type?: 'primary' | 'mentioned' | 'all' }) {
  return useQuery<PersonWithPhoto[]>({
    queryKey: ['people', filter?.type || 'all'],
    queryFn: async (): Promise<PersonWithPhoto[]> => {
      const perf = logPerformance(peopleLogger, 'fetchAllPeople');
      const userId = await getCurrentUserId();
      peopleLogger.debug('Fetching people', { userId, filter });

      // Build where clause based on filter
      const whereConditions = [
        eq(people.userId, userId),
        ne(people.status, 'merged'),
        isNull(people.deletedAt),
        ne(people.personType, 'self'), // Always exclude self from general list
      ];

      if (filter?.type === 'primary') {
        // Show only explicitly added people (primary)
        whereConditions.push(eq(people.personType, 'primary'));
      } else if (filter?.type === 'mentioned') {
        // Show only mentioned/placeholder people
        whereConditions.push(sql`${people.personType} IN ('mentioned', 'placeholder')`);
      }
      // 'all' includes everyone (except self, handled above)

      const peopleResults = (await db
        .select()
        .from(people)
        .where(and(...whereConditions))
        .orderBy(desc(people.updatedAt))) as Person[];

      peopleLogger.info('People fetched', { count: peopleResults.length });

      console.log('[usePeople] Fetched people:', {
        count: peopleResults.length,
        sample: peopleResults.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          relationshipType: p.relationshipType,
          personType: p.personType,
          hasPhotoId: !!p.photoId,
        })),
      });

      // Then try to get photo paths for people with photoId
      const photoIds = peopleResults.filter((p) => p.photoId).map((p) => p.photoId as string);

      let photoMap: Record<string, string> = {};
      if (photoIds.length > 0) {
        try {
          const photosResults = await db
            .select({ id: files.id, filePath: files.filePath })
            .from(files)
            .where(
              sql`${files.id} IN (${sql.join(
                photoIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            );

          for (const photo of photosResults) {
            photoMap[photo.id] = photo.filePath;
          }
          peopleLogger.debug('Photos loaded', { count: photosResults.length });
        } catch (error) {
          // Files table might not exist yet, ignore
          peopleLogger.warn('Failed to fetch photo paths', { error });
        }
      }

      // Combine results
      const result: PersonWithPhoto[] = peopleResults.map((person) => ({
        ...person,
        photoPath: person.photoId ? photoMap[person.photoId] || null : null,
      }));

      perf.end(true, { peopleCount: result.length });
      return result;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });
}

/**
 * Hook to fetch a single person by ID
 */
export function usePerson(personId: string) {
  return useQuery({
    queryKey: ['people', personId],
    queryFn: async () => {
      const result = await db.select().from(people).where(eq(people.id, personId)).limit(1);
      return result[0] || null;
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch the "ME" person (user themselves) for self-relations
 */
export function useMePerson() {
  return useQuery({
    queryKey: ['people', 'me'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const result = await db
        .select()
        .from(people)
        .where(and(eq(people.userId, userId), eq(people.personType, 'self')))
        .limit(1);
      return result[0] || null;
    },
  });
}

/**
 * Hook to create a new person
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewPerson, 'userId'>) => {
      const perf = logPerformance(peopleLogger, 'createPerson');
      const userId = await getCurrentUserId();
      peopleLogger.info('Creating person', { name: data.name, type: data.personType });

      // Check for duplicate name
      if (data.name && (await checkNameExists(userId, data.name))) {
        peopleLogger.warn('Duplicate person name', { name: data.name });
        throw new Error(`A person named "${data.name}" already exists`);
      }

      const result = (await db
        .insert(people)
        .values({
          ...data,
          userId,
          id: randomUUID(),
        })
        .returning()) as any[];

      perf.end(true, { personId: result[0]?.id, name: data.name });
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

/**
 * Hook to update a person
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Person> & { id: string }) => {
      const perf = logPerformance(peopleLogger, 'updatePerson');
      peopleLogger.info('Updating person', { personId: id, fields: Object.keys(data) });

      // Check for duplicate name if name is being updated
      if (data.name) {
        const userId = await getCurrentUserId();
        if (await checkNameExists(userId, data.name, id)) {
          peopleLogger.warn('Duplicate person name on update', { name: data.name });
          throw new Error(`A person named "${data.name}" already exists`);
        }
      }

      const result = (await db
        .update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, id))
        .returning()) as any[];

      perf.end(true, { personId: id });
      return result[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.id] });
    },
  });
}

/**
 * Hook to delete a person (soft delete)
 */
export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      peopleLogger.info('Deleting person (soft)', { personId: id });
      await db.update(people).set({ deletedAt: new Date() }).where(eq(people.id, id));
      peopleLogger.info('Person deleted', { personId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

export type MetLocationSuggestion = {
  value: string;
  source: 'history' | 'trip' | 'country';
  count?: number;
  trip?: { id: string; name: string };
};

/**
 * Returns place suggestions for the "where I met them" input, ranked:
 *   1. Distinct met_location values from this user's people (frequency-ranked)
 *   2. Trip events (eventType = 'trip') with a location set
 *   3. Built-in country list
 *
 * The input is always free text — these are just suggestions.
 */
export function useMetLocationSuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery<MetLocationSuggestion[]>({
    queryKey: ['metLocationSuggestions', trimmed.toLowerCase()],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const lowered = trimmed.toLowerCase();

      // Source 1: previous met_location values
      const historyRows = await db
        .select({
          value: people.metLocation,
          count: sql<number>`COUNT(*)`,
        })
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            isNull(people.deletedAt),
            sql`${people.metLocation} IS NOT NULL AND TRIM(${people.metLocation}) != ''`
          )
        )
        .groupBy(people.metLocation)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);

      const history: MetLocationSuggestion[] = historyRows
        .filter((r) => r.value && (!lowered || r.value.toLowerCase().includes(lowered)))
        .map((r) => ({ value: r.value as string, source: 'history' as const, count: r.count }));

      // Source 2: trip events with a location
      const tripRows = await db
        .select({
          id: events.id,
          name: events.name,
          location: events.location,
        })
        .from(events)
        .where(
          and(
            eq(events.userId, userId),
            eq(events.eventType, 'trip'),
            isNull(events.deletedAt),
            sql`${events.location} IS NOT NULL AND TRIM(${events.location}) != ''`
          )
        )
        .orderBy(desc(events.eventDate))
        .limit(20);

      const trips: MetLocationSuggestion[] = tripRows
        .filter(
          (r) =>
            !lowered ||
            (r.location && r.location.toLowerCase().includes(lowered)) ||
            (r.name && r.name.toLowerCase().includes(lowered))
        )
        .map((r) => ({
          value: r.location as string,
          source: 'trip' as const,
          trip: { id: r.id, name: r.name },
        }));

      // Source 3: built-in country list
      const countries: MetLocationSuggestion[] = COUNTRIES.filter(
        (c) => !lowered || c.toLowerCase().includes(lowered)
      )
        .slice(0, 8)
        .map((c) => ({ value: c, source: 'country' as const }));

      // Dedupe — prefer history > trip > country
      const seen = new Set<string>();
      const out: MetLocationSuggestion[] = [];
      for (const s of [...history, ...trips, ...countries]) {
        const key = s.value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
        if (out.length >= 8) break;
      }
      return out;
    },
    staleTime: 30_000,
  });
}
