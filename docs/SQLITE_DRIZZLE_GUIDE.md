# SQLite + Drizzle ORM — Expo Mobile Guide

**Stack:** `expo-sqlite ~16.0.10` + `drizzle-orm ^0.44.7` + `drizzle-kit ^0.31.6`

---

## Setup

### Database client (`lib/db/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('friends.db');
export const db = drizzle(expoDb, { schema });
```

> ⚠️ Do NOT use `expo-sqlite/next` — that was removed in Expo SDK 54. Import directly from `expo-sqlite`.

### Drizzle config (`drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
```

---

## Schema patterns

Source of truth: [`lib/db/schema.ts`](../friends-mobile/lib/db/schema.ts)

### Standard table skeleton

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const people = sqliteTable('people', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  // ... fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // soft delete
}, (t) => [
  index('people_name_idx').on(t.name),
]);
```

Key conventions:
- **UUIDs** for all primary keys (`crypto.randomUUID()`)
- **Timestamps** as `integer` with `{ mode: 'timestamp' }`
- **Soft deletes** via `deletedAt` (filter `isNull(table.deletedAt)`)
- **Indexes** defined inline in the table callback

---

## Migrations

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply migrations (runs automatically on app start via useMigrations)
npm run db:migrate
```

Migrations are applied at startup in `app/_layout.tsx` using `useMigrations` from `drizzle-orm/expo-sqlite`.

---

## Common query patterns

```typescript
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { people } from '@/lib/db/schema';

// Select (exclude soft-deleted)
const all = await db.select().from(people)
  .where(isNull(people.deletedAt))
  .orderBy(desc(people.createdAt));

// Filter
const person = await db.query.people.findFirst({
  where: (p, { eq }) => eq(p.id, id),
});

// Insert
await db.insert(people).values({
  id: crypto.randomUUID(),
  name: 'Alice',
});

// Update
await db.update(people)
  .set({ name: 'Alice B.', updatedAt: new Date() })
  .where(eq(people.id, id));

// Soft delete
await db.update(people)
  .set({ deletedAt: new Date() })
  .where(eq(people.id, id));
```

## Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(stories).values({ ... });
  await tx.update(people).set({ updatedAt: new Date() }).where(...);
});
```

---

## Relational queries

```typescript
// Define relations in schema.ts
export const peopleRelations = relations(people, ({ many }) => ({
  stories: many(storyPeople),
}));

// Use with db.query
const withStories = await db.query.people.findMany({
  with: { stories: { with: { story: true } } },
  where: (p, { isNull }) => isNull(p.deletedAt),
});
```

---

## Current schema (15 tables)

See [`DATABASE_SCHEMA_FINAL.md`](DATABASE_SCHEMA_FINAL.md) for the table reference or read [`lib/db/schema.ts`](../friends-mobile/lib/db/schema.ts) directly.

| Group | Tables |
|-------|--------|
| Auth | `users`, `magic_link_tokens`, `sessions` |
| Core data | `people`, `connections`, `relations`, `stories`, `secrets`, `contact_events`, `relationship_history`, `events`, `files`, `pending_extractions` |
| App state | `quiz_dismissals`, `reminders` |
