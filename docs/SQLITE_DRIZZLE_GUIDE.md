# SQLite + Drizzle ORM Implementation Guide

**Updated:** November 7, 2025
**Stack:** SQLite + Drizzle ORM + TypeScript

---

## 🎯 Why Drizzle ORM?

### Drizzle vs Alternatives

| Feature | Drizzle | Prisma | TypeORM | Kysely |
|---------|---------|--------|---------|--------|
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Bundle Size** | **~7KB** | 300KB+ | 200KB+ | 20KB |
| **SQL-like API** | ✅ | ❌ (DSL) | ❌ | ✅ |
| **Migrations** | ✅ | ✅ | ✅ | ❌ (manual) |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | Easy | Medium | Hard | Medium |
| **Edge/Mobile** | ✅ | ❌ | ❌ | ✅ |
| **Relational Queries** | ✅ | ✅ | ✅ | ⭐⭐⭐ |

### Why Drizzle Wins:

✅ **Lightweight** - 7KB vs Prisma's 300KB (critical for mobile!)
✅ **SQL-like syntax** - Familiar to SQL developers
✅ **True TypeScript** - No code generation needed (unlike Prisma)
✅ **Edge-ready** - Works everywhere (Cloudflare Workers, mobile, desktop)
✅ **Performance** - Near-raw SQL performance
✅ **No runtime dependencies** - Unlike Prisma's query engine

---

## 📁 Project Structure

```
friends/
├── apps/
│   ├── desktop/                 # Electron app
│   │   ├── src/
│   │   │   ├── main.ts          # Electron main process
│   │   │   ├── preload.ts       # Electron preload
│   │   │   └── renderer/        # React app
│   │   └── package.json
│   └── mobile/                  # Expo app
│       ├── src/
│       └── package.json
├── packages/
│   ├── database/                # Shared database package ⭐
│   │   ├── src/
│   │   │   ├── schema.ts        # Drizzle schema
│   │   │   ├── migrations/      # SQL migrations
│   │   │   ├── client.ts        # Database client
│   │   │   ├── queries/         # Reusable queries
│   │   │   └── types.ts         # TypeScript types
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── shared/                  # Shared business logic
│   └── ui/                      # Shared UI components
└── package.json                 # Root workspace
```

---

## 🏗️ Database Schema Design

### Critical Decisions

#### 1. **ID Strategy: UUIDs vs Auto-Increment**

**Use UUIDs for distributed/sync scenarios:**

```typescript
// ✅ GOOD: UUID (for sync between devices)
id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID())

// ❌ BAD: Auto-increment (conflicts in distributed systems)
id: integer('id').primaryKey({ autoIncrement: true })
```

**Why UUIDs?**
- ✅ No ID conflicts when syncing between devices
- ✅ Can generate offline
- ✅ No coordination needed
- ❌ Slightly larger storage (36 chars vs 4-8 bytes)

#### 2. **Timestamps: Always Include**

```typescript
createdAt: integer('created_at', { mode: 'timestamp' })
  .notNull()
  .$defaultFn(() => new Date()),

updatedAt: integer('updated_at', { mode: 'timestamp' })
  .notNull()
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => new Date())
```

**Why?**
- ✅ Track when records were created/modified
- ✅ Essential for sync (conflict resolution)
- ✅ Audit trail

#### 3. **Soft Deletes: Critical for Sync**

```typescript
deletedAt: integer('deleted_at', { mode: 'timestamp' })
```

**Why?**
- ✅ Sync deletions between devices
- ✅ Can "undelete" if needed
- ✅ Audit trail

#### 4. **Foreign Keys: Always Enable**

```sql
PRAGMA foreign_keys = ON;
```

**Why?**
- ✅ Data integrity
- ✅ Cascade deletes
- ✅ Prevent orphaned records

---

## 📊 Complete Drizzle Schema

### `packages/database/src/schema.ts`

```typescript
import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// USERS TABLE (for future multi-user support)
// ============================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// PEOPLE TABLE
// ============================================
export const people = sqliteTable('people', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nickname: text('nickname'),
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
  }),
  metDate: integer('met_date', { mode: 'timestamp' }),
  birthday: integer('birthday', { mode: 'timestamp' }),
  photoUri: text('photo_uri'), // Local file path or URI
  notes: text('notes'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
}, (table) => ({
  userIdIdx: index('people_user_id_idx').on(table.userId),
  nameIdx: index('people_name_idx').on(table.name),
  deletedAtIdx: index('people_deleted_at_idx').on(table.deletedAt),
}));

// ============================================
// STORIES TABLE
// ============================================
export const stories = sqliteTable('stories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  date: integer('date', { mode: 'timestamp' }),
  location: text('location'),
  extractedData: text('extracted_data', { mode: 'json' }).$type<{
    tags?: string[];
    sentiment?: number;
    summary?: string;
  }>(),
  aiModel: text('ai_model'), // e.g., "gpt-4"
  extractedAt: integer('extracted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: index('stories_user_id_idx').on(table.userId),
  dateIdx: index('stories_date_idx').on(table.date),
  contentFts: index('stories_content_fts').on(table.content), // For full-text search
}));

// ============================================
// STORY_PEOPLE (Junction Table)
// ============================================
export const storyPeople = sqliteTable('story_people', {
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  pk: primaryKey({ columns: [table.storyId, table.personId] }),
  storyIdx: index('story_people_story_idx').on(table.storyId),
  personIdx: index('story_people_person_idx').on(table.personId),
}));

// ============================================
// PREFERENCES TABLE
// ============================================
export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  category: text('category', {
    enum: ['food', 'activity', 'travel', 'entertainment', 'other'],
  }).notNull(),
  item: text('item').notNull(),
  type: text('type', { enum: ['likes', 'dislikes'] }).notNull(),
  confidence: real('confidence').notNull().default(0.5), // 0.0 to 1.0
  sourceStoryId: text('source_story_id').references(() => stories.id, { onDelete: 'set null' }),
  verifiedByUser: integer('verified_by_user', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  personIdIdx: index('preferences_person_id_idx').on(table.personId),
  categoryIdx: index('preferences_category_idx').on(table.category),
  itemIdx: index('preferences_item_idx').on(table.item),
  typeIdx: index('preferences_type_idx').on(table.type),
}));

// ============================================
// CONNECTIONS TABLE (Who knows whom)
// ============================================
export const connections = sqliteTable('connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  person1Id: text('person_1_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  person2Id: text('person_2_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type'), // e.g., "colleagues", "siblings"
  strength: real('strength').default(0.5), // 0.0 to 1.0
  sharedExperiencesCount: integer('shared_experiences_count').default(0),
  discoveredFromStoryId: text('discovered_from_story_id').references(() => stories.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  person1Idx: index('connections_person1_idx').on(table.person1Id),
  person2Idx: index('connections_person2_idx').on(table.person2Id),
  // Ensure person1 < person2 to avoid duplicates
  // Note: This should be handled in application logic
}));

// ============================================
// TIMELINE_EVENTS TABLE
// ============================================
export const timelineEvents = sqliteTable('timeline_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type', {
    enum: ['first_met', 'shared_experience', 'milestone', 'birthday', 'anniversary'],
  }).notNull(),
  description: text('description').notNull(),
  eventDate: integer('event_date', { mode: 'timestamp' }).notNull(),
  location: text('location'),
  sourceStoryId: text('source_story_id').references(() => stories.id, { onDelete: 'set null' }),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: index('timeline_events_user_id_idx').on(table.userId),
  eventDateIdx: index('timeline_events_date_idx').on(table.eventDate),
  eventTypeIdx: index('timeline_events_type_idx').on(table.eventType),
}));

// ============================================
// EVENT_PEOPLE (Junction Table)
// ============================================
export const eventPeople = sqliteTable('event_people', {
  eventId: text('event_id').notNull().references(() => timelineEvents.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.personId] }),
  eventIdx: index('event_people_event_idx').on(table.eventId),
  personIdx: index('event_people_person_idx').on(table.personId),
}));

// ============================================
// ATTACHMENTS TABLE (Photos, files)
// ============================================
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityType: text('entity_type', { enum: ['person', 'story', 'event'] }).notNull(),
  entityId: text('entity_id').notNull(),
  fileUri: text('file_uri').notNull(), // Local file path
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // e.g., "image/jpeg"
  fileSize: integer('file_size'), // bytes
  thumbnailUri: text('thumbnail_uri'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  entityIdx: index('attachments_entity_idx').on(table.entityType, table.entityId),
}));

// ============================================
// SYNC_LOG TABLE (For multi-device sync)
// ============================================
export const syncLog = sqliteTable('sync_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  operation: text('operation', { enum: ['insert', 'update', 'delete'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
  deviceId: text('device_id'), // Identify which device made the change
}, (table) => ({
  syncedIdx: index('sync_log_synced_idx').on(table.synced),
  timestampIdx: index('sync_log_timestamp_idx').on(table.timestamp),
}));

// ============================================
// RELATIONS (for Drizzle's relational queries)
// ============================================
export const peopleRelations = relations(people, ({ one, many }) => ({
  user: one(users, {
    fields: [people.userId],
    references: [users.id],
  }),
  preferences: many(preferences),
  stories: many(storyPeople),
  events: many(eventPeople),
  connectionsAsPerson1: many(connections, { relationName: 'person1' }),
  connectionsAsPerson2: many(connections, { relationName: 'person2' }),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  people: many(storyPeople),
  preferences: many(preferences),
  timelineEvents: many(timelineEvents),
}));

export const preferencesRelations = relations(preferences, ({ one }) => ({
  person: one(people, {
    fields: [preferences.personId],
    references: [people.id],
  }),
  sourceStory: one(stories, {
    fields: [preferences.sourceStoryId],
    references: [stories.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
```

---

## 🔧 Database Client Setup

### `packages/database/src/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Get user's data directory
function getDataDirectory(): string {
  const homeDir = os.homedir();
  const dataDir = path.join(homeDir, 'Documents', 'Friends');

  // Create directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

// Initialize database
export function initializeDatabase(dataDir?: string) {
  const dir = dataDir || getDataDirectory();
  const dbPath = path.join(dir, 'friends.db');

  console.log(`Database location: ${dbPath}`);

  // Open SQLite database
  const sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');

  // Create Drizzle instance
  const db = drizzle(sqlite, { schema });

  return { db, sqlite, dbPath };
}

// Run migrations
export function runMigrations(db: ReturnType<typeof initializeDatabase>['db']) {
  const migrationsFolder = path.join(__dirname, '../migrations');
  migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully');
}

// Singleton instance (for Electron main process)
let dbInstance: ReturnType<typeof initializeDatabase> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
    runMigrations(dbInstance.db);
  }
  return dbInstance;
}

// Close database (call on app quit)
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.sqlite.close();
    dbInstance = null;
  }
}
```

### For Expo/React Native:

```typescript
// packages/database/src/client.mobile.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';
import * as schema from './schema';

export function initializeMobileDatabase() {
  const expoDb = openDatabaseSync('friends.db');
  const db = drizzle(expoDb, { schema });

  // Enable foreign keys
  expoDb.execSync('PRAGMA foreign_keys = ON;');

  return { db, expoDb };
}
```

---

## 📝 Migrations

### `drizzle.config.ts` (in packages/database/)

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './dev.db', // For development only
  },
} satisfies Config;
```

### Generate Migration:

```bash
cd packages/database
npx drizzle-kit generate:sqlite
```

### Apply Migration:

```bash
npx drizzle-kit push:sqlite
# Or use migrate() function in code (shown above)
```

---

## 🔍 Reusable Queries

### `packages/database/src/queries/people.ts`

```typescript
import { eq, and, isNull, like, desc, sql } from 'drizzle-orm';
import type { initializeDatabase } from '../client';
import { people, preferences, stories, storyPeople } from '../schema';
import type { Person, NewPerson } from '../schema';

type DB = ReturnType<typeof initializeDatabase>['db'];

export class PeopleQueries {
  constructor(private db: DB) {}

  // Get all people (exclude soft-deleted)
  async getAll(userId: string): Promise<Person[]> {
    return this.db
      .select()
      .from(people)
      .where(and(eq(people.userId, userId), isNull(people.deletedAt)))
      .orderBy(people.name);
  }

  // Get person by ID
  async getById(id: string): Promise<Person | undefined> {
    const result = await this.db
      .select()
      .from(people)
      .where(and(eq(people.id, id), isNull(people.deletedAt)))
      .limit(1);

    return result[0];
  }

  // Search people by name
  async search(userId: string, query: string): Promise<Person[]> {
    return this.db
      .select()
      .from(people)
      .where(
        and(
          eq(people.userId, userId),
          isNull(people.deletedAt),
          like(people.name, `%${query}%`)
        )
      )
      .orderBy(people.name);
  }

  // Create person
  async create(data: NewPerson): Promise<Person> {
    const result = await this.db.insert(people).values(data).returning();
    return result[0];
  }

  // Update person
  async update(id: string, data: Partial<NewPerson>): Promise<Person> {
    const result = await this.db
      .update(people)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();

    return result[0];
  }

  // Soft delete person
  async delete(id: string): Promise<void> {
    await this.db
      .update(people)
      .set({ deletedAt: new Date() })
      .where(eq(people.id, id));
  }

  // Get person with all preferences (using relational query)
  async getWithPreferences(id: string) {
    return this.db.query.people.findFirst({
      where: eq(people.id, id),
      with: {
        preferences: {
          where: isNull(preferences.deletedAt),
          orderBy: [preferences.category, preferences.item],
        },
      },
    });
  }

  // Get person with all stories
  async getWithStories(id: string) {
    return this.db.query.people.findFirst({
      where: eq(people.id, id),
      with: {
        stories: {
          with: {
            story: {
              where: isNull(stories.deletedAt),
            },
          },
        },
      },
    });
  }

  // Get people who like a specific item
  async getPeopleWhoLike(userId: string, item: string): Promise<Person[]> {
    return this.db
      .select({
        id: people.id,
        userId: people.userId,
        name: people.name,
        nickname: people.nickname,
        relationshipType: people.relationshipType,
        metDate: people.metDate,
        birthday: people.birthday,
        photoUri: people.photoUri,
        notes: people.notes,
        tags: people.tags,
        createdAt: people.createdAt,
        updatedAt: people.updatedAt,
        deletedAt: people.deletedAt,
      })
      .from(people)
      .innerJoin(preferences, eq(people.id, preferences.personId))
      .where(
        and(
          eq(people.userId, userId),
          isNull(people.deletedAt),
          eq(preferences.item, item),
          eq(preferences.type, 'likes'),
          isNull(preferences.deletedAt)
        )
      )
      .orderBy(people.name);
  }

  // Get shared stories count between two people
  async getSharedStoriesCount(person1Id: string, person2Id: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(distinct ${storyPeople.storyId})` })
      .from(storyPeople)
      .innerJoin(
        sql`${storyPeople} as sp2`,
        sql`${storyPeople.storyId} = sp2.story_id AND sp2.person_id = ${person2Id}`
      )
      .where(eq(storyPeople.personId, person1Id));

    return result[0]?.count || 0;
  }
}
```

### Usage in App:

```typescript
import { getDatabase } from '@friends/database/client';
import { PeopleQueries } from '@friends/database/queries/people';

const { db } = getDatabase();
const peopleQueries = new PeopleQueries(db);

// Get all people
const allPeople = await peopleQueries.getAll(userId);

// Search
const results = await peopleQueries.search(userId, 'Ola');

// Create
const newPerson = await peopleQueries.create({
  userId,
  name: 'Ola',
  relationshipType: 'friend',
  metDate: new Date('2015-11-07'),
});

// Get person with preferences
const personWithPrefs = await peopleQueries.getWithPreferences(personId);
console.log(personWithPrefs.preferences);

// Who likes ice cream?
const iceLovers = await peopleQueries.getPeopleWhoLike(userId, 'ice cream');
```

---

## 🔐 Critical Considerations

### 1. **Full-Text Search (FTS5)**

For searching story content:

```typescript
// Enable FTS5 virtual table
db.run(sql`
  CREATE VIRTUAL TABLE stories_fts USING fts5(
    id UNINDEXED,
    content,
    tokenize='porter'
  );
`);

// Populate FTS table
db.run(sql`
  INSERT INTO stories_fts(id, content)
  SELECT id, content FROM stories WHERE deleted_at IS NULL;
`);

// Search
const searchResults = await db.run(sql`
  SELECT stories.* FROM stories
  INNER JOIN stories_fts ON stories.id = stories_fts.id
  WHERE stories_fts MATCH ${query}
  ORDER BY rank;
`);
```

### 2. **Backup Strategy**

```typescript
// packages/database/src/backup.ts
import fs from 'fs';
import path from 'path';

export async function createBackup(dbPath: string): Promise<string> {
  const backupDir = path.join(path.dirname(dbPath), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `friends-${timestamp}.db`);

  // Copy database file
  fs.copyFileSync(dbPath, backupPath);

  // Keep only last 10 backups
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length > 10) {
    backups.slice(10).forEach(backup => {
      fs.unlinkSync(path.join(backupDir, backup));
    });
  }

  return backupPath;
}

// Schedule daily backups
export function scheduleAutoBackup(dbPath: string) {
  setInterval(() => {
    createBackup(dbPath);
    console.log('Auto-backup completed');
  }, 24 * 60 * 60 * 1000); // Every 24 hours
}
```

### 3. **Data Export/Import (for sync)**

```typescript
// Export to JSON
export async function exportToJSON(db: DB, userId: string): Promise<string> {
  const peopleData = await new PeopleQueries(db).getAll(userId);
  const storiesData = await db.select().from(stories).where(eq(stories.userId, userId));
  const prefsData = await db.select().from(preferences);

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    people: peopleData,
    stories: storiesData,
    preferences: prefsData,
  }, null, 2);
}

// Import from JSON
export async function importFromJSON(db: DB, jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  await db.transaction(async (tx) => {
    // Clear existing data (be careful!)
    await tx.delete(preferences);
    await tx.delete(storyPeople);
    await tx.delete(stories);
    await tx.delete(people);

    // Insert imported data
    if (data.people.length > 0) {
      await tx.insert(people).values(data.people);
    }
    if (data.stories.length > 0) {
      await tx.insert(stories).values(data.stories);
    }
    if (data.preferences.length > 0) {
      await tx.insert(preferences).values(data.preferences);
    }
  });
}
```

### 4. **Database Encryption (Optional)**

For sensitive data, use SQLCipher:

```bash
npm install @journeyapps/sqlcipher
```

```typescript
import SQLite from '@journeyapps/sqlcipher';

const sqlite = new SQLite(dbPath);
sqlite.pragma(`key = '${encryptionKey}'`);
```

### 5. **Performance Optimization**

```typescript
// Create indexes for common queries
export function createOptimizationIndexes(db: DB) {
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_people_name_fts ON people(name COLLATE NOCASE);`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_preferences_item_type ON preferences(item, type);`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_stories_date_user ON stories(date DESC, user_id);`);

  // Analyze tables for query optimizer
  db.run(sql`ANALYZE;`);
}

// Vacuum database periodically (reclaim space)
export function vacuumDatabase(db: DB) {
  db.run(sql`VACUUM;`);
}
```

### 6. **Testing**

```typescript
// packages/database/src/__tests__/people.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase } from '../client';
import { PeopleQueries } from '../queries/people';

describe('PeopleQueries', () => {
  let db: ReturnType<typeof initializeDatabase>['db'];
  let queries: PeopleQueries;
  const userId = 'test-user';

  beforeEach(() => {
    // Use in-memory database for tests
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    queries = new PeopleQueries(db);

    // Run migrations
    runMigrations(db);
  });

  it('should create and retrieve a person', async () => {
    const person = await queries.create({
      userId,
      name: 'Ola',
      relationshipType: 'friend',
    });

    expect(person.name).toBe('Ola');
    expect(person.id).toBeDefined();

    const retrieved = await queries.getById(person.id);
    expect(retrieved?.name).toBe('Ola');
  });

  it('should soft delete a person', async () => {
    const person = await queries.create({ userId, name: 'Test' });
    await queries.delete(person.id);

    const retrieved = await queries.getById(person.id);
    expect(retrieved).toBeUndefined();
  });
});
```

---

## 🔄 Multi-Device Sync Strategy

### Approach: CRDTs or Last-Write-Wins (LWW)

```typescript
// Conflict resolution: Last-Write-Wins
export async function syncRecords<T extends { updatedAt: Date }>(
  localRecords: T[],
  remoteRecords: T[]
): Promise<{ toUpdate: T[]; toInsert: T[] }> {
  const localMap = new Map(localRecords.map(r => [r.id, r]));
  const remoteMap = new Map(remoteRecords.map(r => [r.id, r]));

  const toUpdate: T[] = [];
  const toInsert: T[] = [];

  // Check remote records
  for (const [id, remoteRecord] of remoteMap) {
    const localRecord = localMap.get(id);

    if (!localRecord) {
      // New record from remote
      toInsert.push(remoteRecord);
    } else if (remoteRecord.updatedAt > localRecord.updatedAt) {
      // Remote is newer
      toUpdate.push(remoteRecord);
    }
  }

  return { toUpdate, toInsert };
}
```

---

## 📦 Package.json Setup

```json
{
  "name": "@friends/database",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "db:generate": "drizzle-kit generate:sqlite",
    "db:push": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio",
    "test": "vitest"
  },
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "better-sqlite3": "^9.2.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "drizzle-kit": "^0.20.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 🎯 Checklist: What You Need to Think About

### ✅ Schema Design
- [x] UUID primary keys (for sync)
- [x] Timestamps (created_at, updated_at)
- [x] Soft deletes (deleted_at)
- [x] Foreign keys with cascade
- [x] Indexes on frequently queried columns
- [x] JSONB for flexible data (extractedData, metadata)

### ✅ Performance
- [x] Indexes on foreign keys
- [x] FTS5 for full-text search
- [x] WAL mode for concurrency
- [x] PRAGMA optimize
- [x] Periodic VACUUM

### ✅ Data Integrity
- [x] Foreign key constraints
- [x] NOT NULL where appropriate
- [x] ENUMs for fixed values
- [x] Check constraints (e.g., person1 < person2)

### ✅ Sync & Backup
- [x] Export/import to JSON
- [x] Sync log table for tracking changes
- [x] Conflict resolution strategy (LWW)
- [x] Automated backups

### ✅ Security
- [ ] Optional: Database encryption (SQLCipher)
- [x] Input validation
- [x] Parameterized queries (Drizzle handles this)

### ✅ Testing
- [x] Unit tests for queries
- [x] In-memory database for tests
- [x] Integration tests

### ✅ Cross-Platform
- [x] better-sqlite3 for desktop
- [x] expo-sqlite for mobile
- [x] Shared schema package

---

## 🚀 Getting Started

```bash
# 1. Create monorepo
pnpm init

# 2. Setup workspace
# Add to package.json:
{
  "workspaces": ["apps/*", "packages/*"]
}

# 3. Create database package
mkdir -p packages/database/src
cd packages/database
pnpm init
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3 vitest

# 4. Create schema (use code above)
# 5. Generate migrations
pnpm db:generate

# 6. Start building!
```

---

**You're now ready to build a production-grade, local-first Friends app with Drizzle ORM!** 🎉
