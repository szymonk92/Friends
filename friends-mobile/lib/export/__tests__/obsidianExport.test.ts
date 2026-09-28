import { sanitizeFilename, buildFilenameMap, renderPersonNote } from '../obsidianTemplates';
import type { Person, Connection } from '@/lib/db/schema';

function makePerson(overrides: Partial<Person>): Person {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Test Person',
    nickname: null,
    photoId: null,
    relationshipType: null,
    metDate: null,
    metLocation: null,
    socialLinks: null,
    phone: null,
    email: null,
    homeLocation: null,
    languages: null,
    personType: 'placeholder',
    dataCompleteness: 'minimal',
    addedBy: 'auto_created',
    importanceToUser: 'unknown',
    potentialDuplicates: null,
    canonicalId: null,
    mergedFrom: null,
    extractionContext: null,
    mentionCount: 0,
    gender: null,
    status: 'active',
    archiveReason: null,
    archivedAt: null,
    dateOfDeath: null,
    dateOfBirth: null,
    hideFromActiveViews: false,
    lifeMilestones: null,
    notes: null,
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    syncVersion: 1,
    lastSyncedAt: null,
    ...overrides,
  } as Person;
}

describe('sanitizeFilename', () => {
  it('strips filesystem-unsafe characters', () => {
    expect(sanitizeFilename('Jane/Doe: "The Best"?')).toBe('JaneDoe The Best');
  });

  it('falls back to Unnamed for empty input', () => {
    expect(sanitizeFilename('')).toBe('Unnamed');
  });
});

describe('buildFilenameMap', () => {
  it('disambiguates duplicate names', () => {
    const people = [
      makePerson({ id: 'a', name: 'Jane Smith' }),
      makePerson({ id: 'b', name: 'Jane Smith' }),
    ];
    const map = buildFilenameMap(people);
    expect(map.get('a')).toBe('Jane Smith');
    expect(map.get('b')).toBe('Jane Smith 2');
  });
});

describe('renderPersonNote', () => {
  it('skips a connection link to a person not in the filename map', () => {
    const person = makePerson({ id: 'p1', name: 'Alice' });
    const filenameMap = new Map([['p1', 'Alice']]);
    const conn: Connection = {
      id: 'c1',
      userId: 'u1',
      person1Id: 'p1',
      person2Id: 'missing-person',
      relationshipType: 'friend',
      status: 'active',
      qualifier: null,
      strength: 0.5,
      startDate: null,
      endDate: null,
      endReason: null,
      hideFromSuggestions: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      syncVersion: 1,
      lastSyncedAt: null,
    } as Connection;

    const md = renderPersonNote(person, {
      connections: [conn],
      relations: [],
      contactEvents: [],
      photos: [],
      filenameMap,
    });

    expect(md).not.toContain('## Relations');
    expect(md).not.toContain('[[');
  });
});
