import { drizzle } from 'drizzle-orm/expo-sqlite';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import { dbLogger, logPerformance } from '@/lib/logger';

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
        email TEXT UNIQUE,
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

    // Migration: Add email_verified column if it doesn't exist (for existing databases)
    try {
      expoDb.execSync(`ALTER TABLE users ADD COLUMN email_verified INTEGER;`);
    } catch {
      // Column already exists, ignore error
    }

    // Migration: Add all potentially missing columns to users table
    const userColumnMigrations = [
      'ALTER TABLE users ADD COLUMN email TEXT;',
      'ALTER TABLE users ADD COLUMN avatar_url TEXT;',
      'ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user";',
      'ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT "free";',
      'ALTER TABLE users ADD COLUMN subscription_valid_until INTEGER;',
      'ALTER TABLE users ADD COLUMN settings TEXT;',
      'ALTER TABLE users ADD COLUMN deleted_at INTEGER;',
      'ALTER TABLE users ADD COLUMN last_sync_at INTEGER;',
      'ALTER TABLE users ADD COLUMN sync_token TEXT;',
      'ALTER TABLE users ADD COLUMN display_name TEXT;',
      `ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT ${Date.now()};`,
      `ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT ${Date.now()};`,
    ];

    for (const migration of userColumnMigrations) {
      try {
        expoDb.execSync(migration);
      } catch {
        // Column already exists, ignore error
      }
    }

    // Create people table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        nickname TEXT,
        photo_id TEXT,
        relationship_type TEXT,
        met_date INTEGER,
        person_type TEXT DEFAULT 'placeholder',
        data_completeness TEXT DEFAULT 'minimal',
        added_by TEXT DEFAULT 'auto_created',
        importance_to_user TEXT DEFAULT 'unknown',
        user_sentiment TEXT DEFAULT 'neutral',
        potential_duplicates TEXT,
        canonical_id TEXT REFERENCES people(id),
        merged_from TEXT,
        extraction_context TEXT,
        mention_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' NOT NULL,
        archive_reason TEXT,
        archived_at INTEGER,
        date_of_death INTEGER,
        date_of_birth INTEGER,
        hide_from_active_views INTEGER DEFAULT 0,
        notes TEXT,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Migration: Add tags column to people table
    try {
      expoDb.execSync('ALTER TABLE people ADD COLUMN tags TEXT;');
    } catch {
      // Column already exists
    }

    // Migration: Add user_sentiment column to people table
    try {
      expoDb.execSync("ALTER TABLE people ADD COLUMN user_sentiment TEXT DEFAULT 'neutral';");
    } catch {
      // Column already exists
    }

    // Create stories table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        content TEXT NOT NULL,
        ai_processed INTEGER DEFAULT 0,
        ai_processed_at INTEGER,
        extracted_data TEXT,
        people_ids TEXT,
        attachment_ids TEXT,
        story_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create connections table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        person1_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        person2_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        qualifier TEXT,
        strength REAL DEFAULT 0.5,
        start_date INTEGER,
        end_date INTEGER,
        end_reason TEXT,
        hide_from_suggestions INTEGER DEFAULT 0,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create relations table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS relations (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        subject_type TEXT DEFAULT 'person' NOT NULL,
        relation_type TEXT NOT NULL,
        object_id TEXT,
        object_type TEXT,
        object_label TEXT NOT NULL,
        metadata TEXT,
        intensity TEXT,
        confidence REAL DEFAULT 1.0,
        category TEXT,
        source TEXT DEFAULT 'manual',
        valid_from INTEGER,
        valid_to INTEGER,
        status TEXT DEFAULT 'current',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create contact_events table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS contact_events (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        notes TEXT,
        location TEXT,
        duration INTEGER,
        event_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create events table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        event_type TEXT,
        event_date INTEGER,
        location TEXT,
        guest_ids TEXT,
        compatibility_score REAL,
        menu_suggestions TEXT,
        seating_arrangement TEXT,
        warnings TEXT,
        status TEXT DEFAULT 'planned',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create files table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
        story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
        thumbnail_path TEXT,
        created_at INTEGER NOT NULL,
        deleted_at INTEGER,
        cloud_url TEXT,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create magic_link_tokens table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS magic_link_tokens (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    // Create sessions table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        device_name TEXT,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL
      );
    `);

    // Create secrets table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        person_id TEXT REFERENCES people(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        encrypted_content TEXT NOT NULL,
        encryption_salt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create relationship_history table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS relationship_history (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        reason TEXT,
        notes TEXT,
        changed_at INTEGER NOT NULL,
        sync_version INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Create pending_extractions table
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
        review_status TEXT DEFAULT 'pending' NOT NULL,
        reviewed_at INTEGER,
        review_notes TEXT,
        extraction_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create reminders table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        person_id TEXT REFERENCES people(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT,
        reminder_type TEXT NOT NULL,
        scheduled_for INTEGER NOT NULL,
        repeat_interval TEXT DEFAULT 'none',
        notification_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
    `);

    // Create quiz_dismissals table
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS quiz_dismissals (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        quiz_type TEXT NOT NULL,
        question_key TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Create index for quiz dismissals
    try {
      expoDb.execSync(
        `CREATE INDEX IF NOT EXISTS quiz_dismissals_unique_idx ON quiz_dismissals(person_id, quiz_type, question_key);`
      );
    } catch {
      // Index already exists
    }

    dbLogger.info('Database schema initialized successfully');
    await initializeLocalUser();
  } catch (error) {
    dbLogger.error('Database initialization error', { error });
  }
}

// Initialize local user helper
export async function initializeLocalUser(): Promise<string> {
  try {
    dbLogger.debug('Initializing local user');
    const existingUsers = await db.select().from(schema.users).limit(1);

    if (existingUsers.length > 0) {
      dbLogger.debug('Local user exists', { userId: existingUsers[0].id });
      // Ensure "ME" person exists
      await ensureMePerson(existingUsers[0].id);
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

    // Create "ME" person for self-relations
    await ensureMePerson(userId);

    dbLogger.info('Local user created', { userId });
    return userId;
  } catch (error) {
    dbLogger.error('Error initializing local user', { error });
    return randomUUID();
  }
}

// Ensure "ME" person exists for self-relations
async function ensureMePerson(userId: string): Promise<void> {
  try {
    // Check if ME person already exists
    const existingMe = await db
      .select()
      .from(schema.people)
      .where(
        and(eq(schema.people.userId, userId), eq(schema.people.personType, 'self' as any))
      )
      .limit(1);

    if (existingMe.length > 0) {
      dbLogger.debug('ME person already exists', { personId: existingMe[0].id });
      return;
    }

    // Create ME person
    const mePersonId = randomUUID();
    await db.insert(schema.people).values({
      id: mePersonId,
      userId,
      name: 'Me',
      personType: 'self' as any,
      dataCompleteness: 'complete',
      addedBy: 'user',
      importanceToUser: 'very_important',
      status: 'active',
    });

    dbLogger.info('ME person created', { personId: mePersonId });
  } catch (error) {
    dbLogger.warn('Failed to create ME person', { error });
  }
}

// Get current user ID (for Phase 1: always returns local user)
export async function getCurrentUserId(): Promise<string> {
  try {
    const existingUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(1);

    if (existingUsers.length === 0) {
      dbLogger.debug('No users found, creating new user');
      return await initializeLocalUser();
    }

    return existingUsers[0].id;
  } catch (error) {
    dbLogger.error('Error getting user ID', { error });
    return randomUUID();
  }
}
