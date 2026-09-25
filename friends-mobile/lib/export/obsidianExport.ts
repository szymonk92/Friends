import { zipSync } from 'fflate';
import { and, eq, isNull } from 'drizzle-orm';
import { activePeople } from '@/lib/db/filters';
import { File as ExpoFile } from 'expo-file-system';
import { db, getCurrentUserId } from '@/lib/db';
import { people, connections, relations, stories, contactEvents, files, type Person } from '@/lib/db/schema';
import {
  buildFilenameMap,
  renderPersonNote,
  renderStoryNote,
  storyFilename,
  fileExtension,
  type PersonRelatedData,
} from './obsidianTemplates';

export async function buildObsidianVault(): Promise<Uint8Array> {
  const userId = await getCurrentUserId();

  const [peopleRowsRaw, connectionRows, relationRows, contactEventRows, storyRows, fileRows] =
    await Promise.all([
      db
        .select()
        .from(people)
        .where(activePeople(userId)),
      db
        .select()
        .from(connections)
        .where(and(eq(connections.userId, userId), isNull(connections.deletedAt))),
      db
        .select()
        .from(relations)
        .where(and(eq(relations.userId, userId), isNull(relations.deletedAt))),
      db
        .select()
        .from(contactEvents)
        .where(and(eq(contactEvents.userId, userId), isNull(contactEvents.deletedAt))),
      db
        .select()
        .from(stories)
        .where(and(eq(stories.userId, userId), isNull(stories.deletedAt))),
      db
        .select()
        .from(files)
        .where(
          and(eq(files.userId, userId), eq(files.fileType, 'profile_photo'), isNull(files.deletedAt))
        ),
    ]);
  const peopleRows = peopleRowsRaw as Person[];

  const filenameMap = buildFilenameMap(peopleRows);
  const zipInput: Record<string, Uint8Array> = {};
  const encoder = new TextEncoder();

  for (const person of peopleRows) {
    const related: PersonRelatedData = {
      connections: connectionRows.filter(
        (c) => c.person1Id === person.id || c.person2Id === person.id
      ),
      relations: relationRows.filter((r) => r.subjectId === person.id),
      contactEvents: contactEventRows.filter((e) => e.personId === person.id),
      photos: fileRows.filter((f) => f.personId === person.id),
      filenameMap,
    };
    const md = renderPersonNote(person, related);
    zipInput[`People/${filenameMap.get(person.id)}.md`] = encoder.encode(md);
  }

  const usedStoryFilenames = new Set<string>();
  for (const story of storyRows) {
    const filename = storyFilename(story, usedStoryFilenames);
    zipInput[`Stories/${filename}.md`] = encoder.encode(renderStoryNote(story));
  }

  for (const file of fileRows) {
    const bytes = await new ExpoFile(file.filePath).bytes();
    zipInput[`Attachments/${file.id}${fileExtension(file.filename)}`] = bytes;
  }

  return zipSync(zipInput, { level: 6 });
}
