import { initializeDatabase } from './index';

/**
 * Run database migrations
 * This should be called on app startup
 */
export async function runMigrations() {
  try {
    await initializeDatabase();
    // eslint-disable-next-line no-console
    console.log('✅ Database ready');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
