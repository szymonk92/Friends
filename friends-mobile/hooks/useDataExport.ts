import { db, getCurrentUserId } from '@/lib/db';
import { people, relations, connections, stories, contactEvents, files } from '@/lib/db/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { eq, isNull, and, ne } from 'drizzle-orm';
import * as Sharing from 'expo-sharing';
import { Paths, File as ExpoFile, Directory } from 'expo-file-system';

export interface ExportData {
  version: string;
  exportDate: string;
  people: any[];
  relations: any[];
  connections: any[];
  stories: any[];
  contactEvents: any[];
}

/**
 * Hook to export all data as JSON
 */
export function useExportData() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const userId = await getCurrentUserId();

      // Fetch all data
      const [peopleData, relationsData, connectionsData, storiesData, eventsData] =
        await Promise.all([
          db
            .select()
            .from(people)
            .where(
              and(eq(people.userId, userId), isNull(people.deletedAt), ne(people.status, 'merged'))
            ),
          db
            .select()
            .from(relations)
            .where(and(eq(relations.userId, userId), isNull(relations.deletedAt))),
          db
            .select()
            .from(connections)
            .where(and(eq(connections.userId, userId), isNull(connections.deletedAt))),
          db
            .select()
            .from(stories)
            .where(and(eq(stories.userId, userId), isNull(stories.deletedAt))),
          db
            .select()
            .from(contactEvents)
            .where(and(eq(contactEvents.userId, userId), isNull(contactEvents.deletedAt))),
        ]);

      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        people: peopleData.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          metDate: p.metDate ? new Date(p.metDate).toISOString() : null,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : null,
          dateOfDeath: p.dateOfDeath ? new Date(p.dateOfDeath).toISOString() : null,
          archivedAt: p.archivedAt ? new Date(p.archivedAt).toISOString() : null,
        })),
        relations: relationsData.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          validFrom: r.validFrom ? new Date(r.validFrom).toISOString() : null,
          validTo: r.validTo ? new Date(r.validTo).toISOString() : null,
        })),
        connections: connectionsData.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          startDate: c.startDate ? new Date(c.startDate).toISOString() : null,
          endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
        })),
        stories: storiesData.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          storyDate: s.storyDate ? new Date(s.storyDate).toISOString() : null,
          aiProcessedAt: s.aiProcessedAt ? new Date(s.aiProcessedAt).toISOString() : null,
        })),
        contactEvents: eventsData.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
          eventDate: e.eventDate.toISOString(),
        })),
      };

      // Create export file
      const exportDir = new Directory(Paths.cache, 'exports');
      if (!exportDir.exists) {
        exportDir.create();
      }

      const filename = `friends_export_${Date.now()}.json`;
      const exportFile = new ExpoFile(exportDir, filename);
      exportFile.write(JSON.stringify(exportData, null, 2));

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportFile.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Friends Data',
        });
      }

      return exportFile.uri;
    },
  });
}

/**
 * Hook to get export statistics
 */
export function useExportStats() {
  return useQuery({
    queryKey: ['export', 'stats'],
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const [peopleCount, relationsCount, connectionsCount, storiesCount, eventsCount] =
        await Promise.all([
          db
            .select({ id: people.id })
            .from(people)
            .where(
              and(eq(people.userId, userId), isNull(people.deletedAt), ne(people.status, 'merged'))
            ),
          db
            .select({ id: relations.id })
            .from(relations)
            .where(and(eq(relations.userId, userId), isNull(relations.deletedAt))),
          db
            .select({ id: connections.id })
            .from(connections)
            .where(and(eq(connections.userId, userId), isNull(connections.deletedAt))),
          db
            .select({ id: stories.id })
            .from(stories)
            .where(and(eq(stories.userId, userId), isNull(stories.deletedAt))),
          db
            .select({ id: contactEvents.id })
            .from(contactEvents)
            .where(and(eq(contactEvents.userId, userId), isNull(contactEvents.deletedAt))),
        ]);

      return {
        people: peopleCount.length,
        relations: relationsCount.length,
        connections: connectionsCount.length,
        stories: storiesCount.length,
        events: eventsCount.length,
      };
    },
  });
}

/**
 * Hook to import data from JSON
 */
export function useImportData() {
  return useMutation({
    mutationFn: async (jsonData: string): Promise<{ imported: number; errors: string[] }> => {
      const userId = await getCurrentUserId();
      const errors: string[] = [];
      let imported = 0;

      try {
        const data: ExportData = JSON.parse(jsonData);

        if (!data.version || !data.people) {
          throw new Error('Invalid export file format');
        }

        // Import people first (they have no foreign key dependencies)
        for (const person of data.people) {
          try {
            // Check if person with same name already exists
            const existing = await db
              .select()
              .from(people)
              .where(
                and(
                  eq(people.userId, userId),
                  eq(people.name, person.name),
                  isNull(people.deletedAt)
                )
              )
              .limit(1);

            if (existing.length === 0) {
              await db.insert(people).values({
                ...person,
                id: person.id, // Keep original ID for relations
                userId,
                createdAt: new Date(person.createdAt),
                updatedAt: new Date(person.updatedAt),
                metDate: person.metDate ? new Date(person.metDate) : null,
                dateOfBirth: person.dateOfBirth ? new Date(person.dateOfBirth) : null,
                dateOfDeath: person.dateOfDeath ? new Date(person.dateOfDeath) : null,
                archivedAt: person.archivedAt ? new Date(person.archivedAt) : null,
                deletedAt: null,
              });
              imported++;
            } else {
              errors.push(`Person "${person.name}" already exists, skipped`);
            }
          } catch (error: any) {
            errors.push(`Failed to import person ${person.name}: ${error.message}`);
          }
        }

        // Import relations
        if (data.relations) {
          for (const relation of data.relations) {
            try {
              await db.insert(relations).values({
                ...relation,
                userId,
                createdAt: new Date(relation.createdAt),
                updatedAt: new Date(relation.updatedAt),
                validFrom: relation.validFrom ? new Date(relation.validFrom) : null,
                validTo: relation.validTo ? new Date(relation.validTo) : null,
                deletedAt: null,
              });
              imported++;
            } catch (error: any) {
              errors.push(`Failed to import relation: ${error.message}`);
            }
          }
        }

        // Import connections
        if (data.connections) {
          for (const connection of data.connections) {
            try {
              await db.insert(connections).values({
                ...connection,
                userId,
                createdAt: new Date(connection.createdAt),
                updatedAt: new Date(connection.updatedAt),
                startDate: connection.startDate ? new Date(connection.startDate) : null,
                endDate: connection.endDate ? new Date(connection.endDate) : null,
                deletedAt: null,
              });
              imported++;
            } catch (error: any) {
              errors.push(`Failed to import connection: ${error.message}`);
            }
          }
        }

        // Import stories
        if (data.stories) {
          for (const story of data.stories) {
            try {
              await db.insert(stories).values({
                ...story,
                userId,
                createdAt: new Date(story.createdAt),
                updatedAt: new Date(story.updatedAt),
                storyDate: story.storyDate ? new Date(story.storyDate) : null,
                aiProcessedAt: story.aiProcessedAt ? new Date(story.aiProcessedAt) : null,
                deletedAt: null,
              });
              imported++;
            } catch (error: any) {
              errors.push(`Failed to import story: ${error.message}`);
            }
          }
        }

        // Import contact events
        if (data.contactEvents) {
          for (const event of data.contactEvents) {
            try {
              await db.insert(contactEvents).values({
                ...event,
                userId,
                createdAt: new Date(event.createdAt),
                eventDate: new Date(event.eventDate),
                deletedAt: null,
              });
              imported++;
            } catch (error: any) {
              errors.push(`Failed to import event: ${error.message}`);
            }
          }
        }

        return { imported, errors };
      } catch (error: any) {
        throw new Error(`Import failed: ${error.message}`);
      }
    },
  });
}

/**
 * Hook to export data as CSV (people only)
 */
export function useExportPeopleCSV() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const userId = await getCurrentUserId();

      const peopleData = await db
        .select()
        .from(people)
        .where(
          and(eq(people.userId, userId), isNull(people.deletedAt), ne(people.status, 'merged'))
        );

      // Create CSV header
      const headers = [
        'Name',
        'Nickname',
        'Relationship Type',
        'Importance',
        'Birthday',
        'Met Date',
        'Notes',
        'Tags',
      ];

      // Create CSV rows
      const rows = peopleData.map((p) => {
        const tags = p.tags ? JSON.parse(p.tags).join('; ') : '';
        return [
          p.name,
          p.nickname || '',
          p.relationshipType || '',
          p.importanceToUser || '',
          p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
          p.metDate ? new Date(p.metDate).toISOString().split('T')[0] : '',
          (p.notes || '').replace(/"/g, '""'), // Escape quotes
          tags,
        ];
      });

      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Create export file
      const exportDir = new Directory(Paths.cache, 'exports');
      if (!exportDir.exists) {
        exportDir.create();
      }

      const filename = `friends_people_${Date.now()}.csv`;
      const exportFile = new ExpoFile(exportDir, filename);
      exportFile.write(csvContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportFile.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export People Data',
        });
      }

      return exportFile.uri;
    },
  });
}
