import { drizzle } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expoDb = openDatabaseSync('friends.db');

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

// Initialize database with basic tables
export async function initializeDatabase() {
  try {
    // Create users table with full schema to match Drizzle schema
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT,
        email_verified INTEGER,
        display_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user' NOT NULL,
        subscription_tier TEXT DEFAULT 'free' NOT NULL,
        subscription_valid_until INTEGER,
        settings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        last_sync_at INTEGER,
        sync_token TEXT
      );
    `);

    console.log('✅ Database schema initialized');
    await initializeLocalUser();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize local user helper
export async function initializeLocalUser(): Promise<string> {
  try {
    const existingUsers = await db.select().from(schema.users).limit(1);

    if (existingUsers.length > 0) {
      return existingUsers[0].id;
    }

    const userId = randomUUID();
    await db
      .insert(schema.users)
      .values({
        id: userId,
        email: null,
        displayName: 'Me',
        subscriptionTier: 'free',
      });

    return userId;
  } catch (error) {
    console.error('Error initializing local user:', error);
    return randomUUID();
  }
}

// Get current user ID (for Phase 1: always returns local user)
export async function getCurrentUserId(): Promise<string> {
  try {
    const existingUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(1);

    if (existingUsers.length === 0) {
      return await initializeLocalUser();
    }

    return existingUsers[0].id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return randomUUID();
  }
}
