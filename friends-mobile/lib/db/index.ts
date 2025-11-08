import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expoDb = openDatabaseSync('friends.db');

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

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
