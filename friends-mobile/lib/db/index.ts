import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expoDb = openDatabaseSync('friends.db');

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

// Initialize pending_extractions table if it doesn't exist
try {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS pending_extractions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      subject_name TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      object_label TEXT NOT NULL,
      object_type TEXT,
      intensity TEXT,
      confidence REAL NOT NULL,
      category TEXT,
      metadata TEXT,
      status TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at INTEGER,
      review_notes TEXT,
      extraction_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS pending_extractions_user_id_idx ON pending_extractions(user_id);
  `);

  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS pending_extractions_story_id_idx ON pending_extractions(story_id);
  `);

  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS pending_extractions_subject_id_idx ON pending_extractions(subject_id);
  `);

  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS pending_extractions_review_status_idx ON pending_extractions(review_status);
  `);
} catch (error) {
  // eslint-disable-next-line no-console
  console.log('Pending extractions table initialization:', error);
}

// Initialize local user helper
export async function initializeLocalUser(): Promise<string> {
  // Check if user exists
  const existingUsers = await db.select().from(schema.users).limit(1);

  if (existingUsers.length > 0) {
    return existingUsers[0].id;
  }

  // Create local user
  const [user] = await db
    .insert(schema.users)
    .values({
      id: crypto.randomUUID(),
      email: null,
      displayName: 'Me',
      subscriptionTier: 'free',
    })
    .returning();

  return user.id;
}

// Get current user ID (for Phase 1: always returns local user)
export async function getCurrentUserId(): Promise<string> {
  const existingUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(1);

  if (existingUsers.length === 0) {
    return await initializeLocalUser();
  }

  return existingUsers[0].id;
}
