import { initializeDatabase } from './index';

/**
 * Run database migrations
 * This should be called on app startup
 */
export async function runMigrations() {
  try {
    await initializeDatabase();
    console.log('✅ Database ready');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
