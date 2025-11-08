import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite/next';
import * as schema from './schema';

/**
 * Run database migrations
 * This should be called on app startup
 */
export async function runMigrations() {
  try {
    const db = openDatabaseSync('friends.db');
    const drizzleDb = drizzle(db, { schema });

    // Run migrations from the migrations folder
    await migrate(drizzleDb, {
      migrationsFolder: './lib/db/migrations',
    });

    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}
