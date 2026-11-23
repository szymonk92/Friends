import * as Notifications from 'expo-notifications';
import { scheduleBirthdayReminders } from '@/lib/notifications/birthday-reminders';
import { db, getCurrentUserId } from '@/lib/db';
import { people, files, events, reminders, connections, contactEvents, pendingExtractions, type NewPerson, type Person } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { activePeople } from '@/lib/db/filters';
import { randomUUID } from 'expo-crypto';
import { peopleLogger, logPerformance } from '@/lib/logger';
import { COUNTRIES } from '@/lib/data/countries';
import { entityConstraintFor, type EntityTypeFilter } from '@/lib/people/entityFilter';
import { resolvePhotoUri } from '@/lib/utils/photos';

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
  const conditions = [
    activePeople(userId),
    sql`lower(${people.name}) = ${normalizedName}`,
    ...(excludeId ? [ne(people.id, excludeId)] : []),
  ];
  const existingPeople = await db.select().from(people).where(and(...conditions)).limit(1);
  return existingPeople.length > 0;
}

const BIRTHDAY_FIELDS = ['dateOfBirth', 'dateOfBirthPrecision', 'birthdayReminder', 'name', 'deletedAt'] as const;

const rescheduleBirthdays = () =>
  scheduleBirthdayReminders().catch((e) => peopleLogger.warn('Birthday reschedule failed', { error: String(e) }));

/**
 * Hook to fetch all people
 */
export function usePeople(filter?: {
  type?: 'primary' | 'mentioned' | 'all';
  entityType?: EntityTypeFilter;
}) {
  return useQuery<PersonWithPhoto[]>({
    queryKey: ['people', filter?.type || 'all', filter?.entityType || 'person'],
    queryFn: async (): Promise<PersonWithPhoto[]> => {
      const perf = logPerformance(peopleLogger, 'fetchAllPeople');
      const userId = await getCurrentUserId();
      peopleLogger.debug('Fetching people', { userId, filter });

      // Build where clause based on filter
      const whereConditions = [
        activePeople(userId),
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

      const entityConstraint = entityConstraintFor(filter?.entityType);
      if (entityConstraint) {
        whereConditions.push(eq(people.entityType, entityConstraint));
      }

      const peopleResults = (await db
        .select()
        .from(people)
        .where(and(...whereConditions))
        .orderBy(desc(people.updatedAt))) as Person[];

      peopleLogger.info('People fetched', { count: peopleResults.length });

      // Then try to get photo paths for people with photoId
      const photoIds = peopleResults.filter((p) => p.photoId).map((p) => p.photoId as string);

      let photoMap: Record<string, string> = {};
      if (photoIds.length > 0) {
        try {
          const photosResults = await db
            .select({ id: files.id, filePath: files.filePath })
            .from(files)
            .where(and(inArray(files.id, photoIds), isNull(files.deletedAt)));

          for (const photo of photosResults) {
            photoMap[photo.id] = resolvePhotoUri(photo.filePath);
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
      const result = await db
        .select()
        .from(people)
        .where(and(eq(people.id, personId), isNull(people.deletedAt)))
        .limit(1);
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

      const newPerson: NewPerson = { ...data, userId, id: randomUUID() };
      const [created] = (await db.insert(people).values(newPerson).returning()) as Person[];

      perf.end(true, { personId: created?.id, name: data.name });
      return created;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      if (variables.dateOfBirth) rescheduleBirthdays();
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

      const [updated] = (await db
        .update(people)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(people.id, id))
        .returning()) as Person[];

      perf.end(true, { personId: id });
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', variables.id] });
      // Yearly birthday notifications are pre-scheduled; refresh them whenever an input changes.
      if (BIRTHDAY_FIELDS.some((k) => k in variables)) rescheduleBirthdays();
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
      const now = new Date();
      // Soft delete never triggers the FK cascades, so retire dependent rows explicitly.
      const personReminders = await db
        .select({ notificationId: reminders.notificationId })
        .from(reminders)
        .where(and(eq(reminders.personId, id), isNull(reminders.deletedAt)));
      for (const r of personReminders) {
        if (r.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
        }
      }
      await db
        .update(reminders)
        .set({ deletedAt: now, status: 'cancelled' })
        .where(and(eq(reminders.personId, id), isNull(reminders.deletedAt)));
      await db
        .update(connections)
        .set({ deletedAt: now })
        .where(and(or(eq(connections.person1Id, id), eq(connections.person2Id, id)), isNull(connections.deletedAt)));
      await db
        .update(contactEvents)
        .set({ deletedAt: now })
        .where(and(eq(contactEvents.personId, id), isNull(contactEvents.deletedAt)));
      await db
        .update(pendingExtractions)
        .set({ reviewStatus: 'rejected', reviewedAt: now })
        .where(and(eq(pendingExtractions.subjectId, id), eq(pendingExtractions.reviewStatus, 'pending')));
      await db.update(people).set({ deletedAt: now }).where(eq(people.id, id));
      peopleLogger.info('Person deleted', { personId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      for (const key of ['relations', 'connections', 'contactEvents', 'reminders', 'pending-extractions']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      rescheduleBirthdays();
    },
  });
}

export type LocationSuggestionSource = 'history' | 'trip' | 'country';

export type LocationSuggestion = {
  value: string;
  source: LocationSuggestionSource;
  count?: number;
  trip?: { id: string; name: string };
};

export type LocationKind = 'met' | 'home';

/**
 * Returns place suggestions for either the "where I met them" or "where they live"
 * inputs. Ranked: history (own data) > trips (only for 'met') > countries.
 * Free text always wins — these are just suggestions, never a constraint.
 */
export function useLocationSuggestions(query: string, kind: LocationKind = 'met') {
  const trimmed = query.trim();
  return useQuery<LocationSuggestion[]>({
    queryKey: ['locationSuggestions', kind, trimmed.toLowerCase()],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const lowered = trimmed.toLowerCase();
      const column = kind === 'met' ? people.metLocation : people.homeLocation;

      const historyRows = await db
        .select({
          value: column,
          count: sql<number>`COUNT(*)`,
        })
        .from(people)
        .where(
          and(
            eq(people.userId, userId),
            isNull(people.deletedAt),
            sql`${column} IS NOT NULL AND TRIM(${column}) != ''`
          )
        )
        .groupBy(column)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);

      const history: LocationSuggestion[] = historyRows
        .filter((r) => r.value && (!lowered || r.value.toLowerCase().includes(lowered)))
        .map((r) => ({ value: r.value as string, source: 'history' as const, count: r.count }));

      let trips: LocationSuggestion[] = [];
      if (kind === 'met') {
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

        trips = tripRows
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
      }

      const countries: LocationSuggestion[] = COUNTRIES.filter(
        (c) => !lowered || c.toLowerCase().includes(lowered)
      )
        .slice(0, 8)
        .map((c) => ({ value: c, source: 'country' as const }));

      const seen = new Set<string>();
      const out: LocationSuggestion[] = [];
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

/** @deprecated kept for backwards compatibility */
export type MetLocationSuggestion = LocationSuggestion;
