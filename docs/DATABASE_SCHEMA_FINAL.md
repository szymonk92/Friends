# Final Production Database Schema

**Future-proof schema for Phases 1-5, including magic link authentication**

---

## 🎯 Design Principles

1. **Multi-user ready** - Every table has `userId` for future web app
2. **UUID everywhere** - Distributed sync without conflicts
3. **Soft deletes** - `deletedAt` on all tables (GDPR, sync)
4. **Timestamps** - `createdAt`, `updatedAt` for audit trail
5. **Lifecycle states** - Handle relationship changes gracefully
6. **Future-proof** - Magic link auth fields ready but unused in Phase 1

---

## 📊 Complete Schema (Drizzle ORM)

### 1. **Users Table** (Phase 1: Local only, Phase 4+: Multi-user web app)

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  // Primary key
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Phase 1: Single local user
  // Phase 4+: Multi-user web app
  email: text('email').unique(), // For magic link (Phase 4+)
  emailVerified: integer('email_verified', { mode: 'timestamp' }), // Magic link verification

  // Profile
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),

  // Phase 1: Not used (single user = "local")
  // Phase 4+: Used for authentication
  role: text('role', {
    enum: ['user', 'premium', 'pro'],
  }).notNull().default('user'),

  // Subscription/License
  subscriptionTier: text('subscription_tier', {
    enum: ['free', 'premium', 'pro'],
  }).notNull().default('free'),
  subscriptionValidUntil: integer('subscription_valid_until', { mode: 'timestamp' }),

  // Settings
  settings: text('settings'), // JSON blob for user preferences

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete

  // Phase 4+: Cloud sync metadata
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
  syncToken: text('sync_token'), // For conflict resolution
});
```

**Phase 1 Usage:**
```typescript
// Create single local user on first run
const localUser = await db.insert(users).values({
  id: crypto.randomUUID(),
  email: null, // Not used in Phase 1
  displayName: 'Me',
  subscriptionTier: 'free',
});
```

**Phase 4+ Usage:**
```typescript
// Magic link authentication
const user = await db.insert(users).values({
  id: crypto.randomUUID(),
  email: 'user@example.com',
  emailVerified: null, // Set after magic link click
  displayName: 'John Doe',
  subscriptionTier: 'free',
});
```

---

### 2. **Magic Link Tokens** (Phase 4+ only)

```typescript
export const magicLinkTokens = sqliteTable('magic_link_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Token
  token: text('token').notNull().unique(), // Random secure token
  email: text('email').notNull(),

  // Expiration
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // 15 minutes
  usedAt: integer('used_at', { mode: 'timestamp' }), // null = not used yet

  // Metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

**Phase 4+ Usage:**
```typescript
// Generate magic link
const token = crypto.randomBytes(32).toString('hex');
await db.insert(magicLinkTokens).values({
  userId: user.id,
  token,
  email: user.email,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
});

// Send email: https://app.friends.com/auth/verify?token=...

// Verify token
const tokenRecord = await db
  .select()
  .from(magicLinkTokens)
  .where(
    and(
      eq(magicLinkTokens.token, token),
      isNull(magicLinkTokens.usedAt),
      gt(magicLinkTokens.expiresAt, new Date())
    )
  )
  .limit(1);

if (tokenRecord[0]) {
  // Mark as used
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, tokenRecord[0].id));

  // Verify email
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, tokenRecord[0].userId));

  // Create session
  return createSession(tokenRecord[0].userId);
}
```

---

### 3. **Sessions** (Phase 4+ only)

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Session token
  sessionToken: text('session_token').notNull().unique(),

  // Expiration
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // 30 days

  // Metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceName: text('device_name'), // "Chrome on MacOS", "iPhone 15"

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

---

### 4. **People Table** (Enhanced with lifecycle)

```typescript
export const people = sqliteTable('people', {
  // Primary key
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // User ownership (Phase 1: single user, Phase 4+: multi-user)
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic info
  name: text('name').notNull(),
  nickname: text('nickname'),
  photoId: text('photo_id'), // References files/{id}.jpg

  // Relationship to user
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
  }),
  metDate: integer('met_date', { mode: 'timestamp' }),

  // Lifecycle management (NEW)
  status: text('status', {
    enum: ['active', 'archived', 'deceased'],
  }).notNull().default('active'),

  archiveReason: text('archive_reason', {
    enum: ['no_longer_in_touch', 'moved_away', 'deceased', 'breakup', 'other'],
  }),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),

  // Deceased handling
  dateOfDeath: integer('date_of_death', { mode: 'timestamp' }),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }), // For birthday reminders

  // Privacy
  hideFromActiveViews: integer('hide_from_active_views', { mode: 'boolean' }).default(false),

  // Notes
  notes: text('notes'), // Private notes about this person

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete

  // Phase 4+: Sync metadata
  syncVersion: integer('sync_version').default(1), // For conflict resolution
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const peopleIndexes = {
  userIdIndex: index('people_user_id_idx').on(people.userId),
  statusIndex: index('people_status_idx').on(people.status),
  nameIndex: index('people_name_idx').on(people.name),
};
```

---

### 5. **Connections Table** (People-to-People relationships)

```typescript
export const connections = sqliteTable('connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // The two people in the relationship
  person1Id: text('person1_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  person2Id: text('person2_id').notNull().references(() => people.id, { onDelete: 'cascade' }),

  // Relationship type
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'partner', 'acquaintance'],
  }).notNull(),

  // Lifecycle (NEW)
  status: text('status', {
    enum: ['active', 'inactive', 'ended', 'complicated'],
  }).notNull().default('active'),

  // Qualifiers (e.g., "married", "siblings", "ex-spouse")
  qualifier: text('qualifier'), // "married", "dating", "siblings", "cousins", "ex-spouse"

  // Strength of connection (0.0 to 1.0)
  strength: real('strength').default(0.5),

  // Lifecycle timestamps (NEW)
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  endReason: text('end_reason', {
    enum: ['divorce', 'breakup', 'falling_out', 'death', 'lost_touch', 'other'],
  }),

  // Privacy (NEW)
  hideFromSuggestions: integer('hide_from_suggestions', { mode: 'boolean' }).default(false),

  // Notes
  notes: text('notes'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const connectionsIndexes = {
  userIdIndex: index('connections_user_id_idx').on(connections.userId),
  person1Index: index('connections_person1_idx').on(connections.person1Id),
  person2Index: index('connections_person2_idx').on(connections.person2Id),
  statusIndex: index('connections_status_idx').on(connections.status),
};
```

---

### 6. **Relations Table** (Person-to-Thing relationships)

20 core relation types: KNOWS, LIKES, DISLIKES, ASSOCIATED_WITH, EXPERIENCED, HAS_SKILL, OWNS, HAS_IMPORTANT_DATE, IS, BELIEVES, FEARS, WANTS_TO_ACHIEVE, STRUGGLES_WITH, CARES_FOR, DEPENDS_ON, REGULARLY_DOES, PREFERS_OVER, USED_TO_BE, SENSITIVE_TO, UNCOMFORTABLE_WITH

```typescript
export const relations = sqliteTable('relations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Subject (always a person)
  subjectId: text('subject_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  subjectType: text('subject_type').notNull().default('person'),

  // Relation type (20 core types)
  relationType: text('relation_type', {
    enum: [
      'KNOWS',
      'LIKES',
      'DISLIKES',
      'ASSOCIATED_WITH',
      'EXPERIENCED',
      'HAS_SKILL',
      'OWNS',
      'HAS_IMPORTANT_DATE',
      'IS',
      'BELIEVES',
      'FEARS',
      'WANTS_TO_ACHIEVE',
      'STRUGGLES_WITH',
      'CARES_FOR',
      'DEPENDS_ON',
      'REGULARLY_DOES',
      'PREFERS_OVER',
      'USED_TO_BE',
      'SENSITIVE_TO',
      'UNCOMFORTABLE_WITH',
    ],
  }).notNull(),

  // Object (what they like/know/have)
  objectId: text('object_id'), // UUID reference (optional, can be inline string)
  objectType: text('object_type'), // "preference", "skill", "location", "experience", "possession", "date"
  objectLabel: text('object_label').notNull(), // Human-readable: "ice cream", "Italy", "guitar"

  // Metadata (flexible JSON)
  metadata: text('metadata'), // JSON: { intensity, category, confidence, source, ... }

  // Common fields (extracted from metadata for querying)
  intensity: text('intensity', {
    enum: ['weak', 'medium', 'strong', 'very_strong'],
  }),
  confidence: real('confidence').default(1.0), // 0.0 to 1.0
  category: text('category'), // "food", "activity", "music", "sport", etc.
  source: text('source', {
    enum: ['manual', 'ai_extraction', 'question_mode', 'voice_note', 'import'],
  }).default('manual'),

  // Temporal metadata (for tracking changes over time)
  validFrom: integer('valid_from', { mode: 'timestamp' }), // When this became true
  validTo: integer('valid_to', { mode: 'timestamp' }), // When this stopped being true (null = current)
  status: text('status', {
    enum: ['current', 'past', 'future', 'aspiration'],
  }).default('current'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const relationsIndexes = {
  userIdIndex: index('relations_user_id_idx').on(relations.userId),
  subjectIndex: index('relations_subject_idx').on(relations.subjectId),
  relationTypeIndex: index('relations_type_idx').on(relations.relationType),
  categoryIndex: index('relations_category_idx').on(relations.category),
};
```

---

### 7. **Stories Table** (Phase 2+: AI extraction)

```typescript
export const stories = sqliteTable('stories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Story content
  title: text('title'),
  content: text('content').notNull(), // The story text

  // AI extraction
  aiProcessed: integer('ai_processed', { mode: 'boolean' }).default(false),
  aiProcessedAt: integer('ai_processed_at', { mode: 'timestamp' }),
  extractedData: text('extracted_data'), // JSON: extracted relations

  // Associated people (many-to-many via JSON)
  peopleIds: text('people_ids'), // JSON array of person IDs

  // Attachments
  attachmentIds: text('attachment_ids'), // JSON array of file IDs

  // Timestamps
  storyDate: integer('story_date', { mode: 'timestamp' }), // When the story happened
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const storiesIndexes = {
  userIdIndex: index('stories_user_id_idx').on(stories.userId),
  storyDateIndex: index('stories_date_idx').on(stories.storyDate),
};
```

---

### 8. **Secrets Table** (Password-protected notes)

```typescript
export const secrets = sqliteTable('secrets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Associated person (optional)
  personId: text('person_id').references(() => people.id, { onDelete: 'cascade' }),

  // Secret content
  title: text('title').notNull(),
  encryptedContent: text('encrypted_content').notNull(), // AES-256 encrypted
  encryptionSalt: text('encryption_salt').notNull(), // For PBKDF2

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync (encrypted, so safe to sync)
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const secretsIndexes = {
  userIdIndex: index('secrets_user_id_idx').on(secrets.userId),
  personIdIndex: index('secrets_person_id_idx').on(secrets.personId),
};
```

---

### 9. **Contact Events** (Relationship Health Tracker)

```typescript
export const contactEvents = sqliteTable('contact_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Person contacted
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),

  // Event type
  eventType: text('event_type', {
    enum: ['in_person', 'phone', 'video', 'message', 'email', 'social_media'],
  }).notNull(),

  // Details
  notes: text('notes'),
  location: text('location'),
  duration: integer('duration'), // minutes

  // Timestamp
  eventDate: integer('event_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const contactEventsIndexes = {
  userIdIndex: index('contact_events_user_id_idx').on(contactEvents.userId),
  personIdIndex: index('contact_events_person_id_idx').on(contactEvents.personId),
  eventDateIndex: index('contact_events_date_idx').on(contactEvents.eventDate),
};
```

---

### 10. **Relationship History** (Audit trail)

```typescript
export const relationshipHistory = sqliteTable('relationship_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // What changed
  connectionId: text('connection_id').references(() => connections.id, { onDelete: 'cascade' }),

  // Change details
  changeType: text('change_type', {
    enum: [
      'created',
      'status_changed',
      'qualifier_changed',
      'ended',
      'reactivated',
      'archived',
    ],
  }).notNull(),

  // Before and after
  previousValue: text('previous_value'), // JSON
  newValue: text('new_value'), // JSON

  // Why
  reason: text('reason'),
  notes: text('notes'),

  // Timestamp
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const relationshipHistoryIndexes = {
  userIdIndex: index('relationship_history_user_id_idx').on(relationshipHistory.userId),
  connectionIdIndex: index('relationship_history_connection_idx').on(relationshipHistory.connectionId),
};
```

---

### 11. **Events Table** (Smart Event Planner, Phase 3)

```typescript
export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Event details
  name: text('name').notNull(),
  description: text('description'),
  eventType: text('event_type', {
    enum: ['dinner', 'party', 'gathering', 'meeting', 'trip', 'other'],
  }),

  // Date and location
  eventDate: integer('event_date', { mode: 'timestamp' }),
  location: text('location'),

  // Guest list
  guestIds: text('guest_ids'), // JSON array of person IDs

  // AI suggestions (generated)
  compatibilityScore: real('compatibility_score'), // 0-100
  menuSuggestions: text('menu_suggestions'), // JSON
  seatingArrangement: text('seating_arrangement'), // JSON
  warnings: text('warnings'), // JSON array of issues (ex-partners, etc.)

  // Status
  status: text('status', {
    enum: ['planned', 'confirmed', 'completed', 'cancelled'],
  }).default('planned'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const eventsIndexes = {
  userIdIndex: index('events_user_id_idx').on(events.userId),
  eventDateIndex: index('events_date_idx').on(events.eventDate),
  statusIndex: index('events_status_idx').on(events.status),
};
```

---

### 12. **Attachments/Files** (Photos, images)

```typescript
export const files = sqliteTable('files', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // File details
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // bytes
  filePath: text('file_path').notNull(), // Local: relative path, Cloud: S3 URL

  // Type
  fileType: text('file_type', {
    enum: ['profile_photo', 'story_image', 'attachment'],
  }).notNull(),

  // Associated records
  personId: text('person_id').references(() => people.id, { onDelete: 'set null' }),
  storyId: text('story_id').references(() => stories.id, { onDelete: 'set null' }),

  // Thumbnails
  thumbnailPath: text('thumbnail_path'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),

  // Sync (cloud storage URL)
  cloudUrl: text('cloud_url'), // Phase 4+: S3/CloudFlare URL
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// Indexes
export const filesIndexes = {
  userIdIndex: index('files_user_id_idx').on(files.userId),
  personIdIndex: index('files_person_id_idx').on(files.personId),
  storyIdIndex: index('files_story_id_idx').on(files.storyId),
};
```

---

## 🚀 Drizzle Schema File

Complete `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp' }),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'premium', 'pro'] }).notNull().default('user'),
  subscriptionTier: text('subscription_tier', { enum: ['free', 'premium', 'pro'] }).notNull().default('free'),
  subscriptionValidUntil: integer('subscription_valid_until', { mode: 'timestamp' }),
  settings: text('settings'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
  syncToken: text('sync_token'),
});

export const magicLinkTokens = sqliteTable('magic_link_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceName: text('device_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================================================
// CORE DATA
// ============================================================================

export const people = sqliteTable(
  'people',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nickname: text('nickname'),
    photoId: text('photo_id'),
    relationshipType: text('relationship_type', {
      enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
    }),
    metDate: integer('met_date', { mode: 'timestamp' }),
    status: text('status', { enum: ['active', 'archived', 'deceased'] }).notNull().default('active'),
    archiveReason: text('archive_reason', {
      enum: ['no_longer_in_touch', 'moved_away', 'deceased', 'breakup', 'other'],
    }),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    dateOfDeath: integer('date_of_death', { mode: 'timestamp' }),
    dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
    hideFromActiveViews: integer('hide_from_active_views', { mode: 'boolean' }).default(false),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('people_user_id_idx').on(table.userId),
    statusIdx: index('people_status_idx').on(table.status),
    nameIdx: index('people_name_idx').on(table.name),
  })
);

export const connections = sqliteTable(
  'connections',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    person1Id: text('person1_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    person2Id: text('person2_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    relationshipType: text('relationship_type', {
      enum: ['friend', 'family', 'colleague', 'partner', 'acquaintance'],
    }).notNull(),
    status: text('status', { enum: ['active', 'inactive', 'ended', 'complicated'] }).notNull().default('active'),
    qualifier: text('qualifier'),
    strength: real('strength').default(0.5),
    startDate: integer('start_date', { mode: 'timestamp' }),
    endDate: integer('end_date', { mode: 'timestamp' }),
    endReason: text('end_reason', {
      enum: ['divorce', 'breakup', 'falling_out', 'death', 'lost_touch', 'other'],
    }),
    hideFromSuggestions: integer('hide_from_suggestions', { mode: 'boolean' }).default(false),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('connections_user_id_idx').on(table.userId),
    person1Idx: index('connections_person1_idx').on(table.person1Id),
    person2Idx: index('connections_person2_idx').on(table.person2Id),
    statusIdx: index('connections_status_idx').on(table.status),
  })
);

export const relations = sqliteTable(
  'relations',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    subjectId: text('subject_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').notNull().default('person'),
    relationType: text('relation_type', {
      enum: ['KNOWS', 'LIKES', 'DISLIKES', 'ASSOCIATED_WITH', 'EXPERIENCED', 'HAS_SKILL', 'OWNS', 'HAS_IMPORTANT_DATE', 'IS', 'BELIEVES', 'FEARS', 'WANTS_TO_ACHIEVE', 'STRUGGLES_WITH', 'CARES_FOR', 'DEPENDS_ON', 'REGULARLY_DOES', 'PREFERS_OVER', 'USED_TO_BE', 'SENSITIVE_TO', 'UNCOMFORTABLE_WITH'],
    }).notNull(),
    objectId: text('object_id'),
    objectType: text('object_type'),
    objectLabel: text('object_label').notNull(),
    metadata: text('metadata'),
    intensity: text('intensity', { enum: ['weak', 'medium', 'strong', 'very_strong'] }),
    confidence: real('confidence').default(1.0),
    category: text('category'),
    source: text('source', {
      enum: ['manual', 'ai_extraction', 'question_mode', 'voice_note', 'import'],
    }).default('manual'),
    validFrom: integer('valid_from', { mode: 'timestamp' }),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    status: text('status', { enum: ['current', 'past', 'future', 'aspiration'] }).default('current'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('relations_user_id_idx').on(table.userId),
    subjectIdx: index('relations_subject_idx').on(table.subjectId),
    relationTypeIdx: index('relations_type_idx').on(table.relationType),
    categoryIdx: index('relations_category_idx').on(table.category),
  })
);

export const stories = sqliteTable(
  'stories',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull(),
    aiProcessed: integer('ai_processed', { mode: 'boolean' }).default(false),
    aiProcessedAt: integer('ai_processed_at', { mode: 'timestamp' }),
    extractedData: text('extracted_data'),
    peopleIds: text('people_ids'),
    attachmentIds: text('attachment_ids'),
    storyDate: integer('story_date', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('stories_user_id_idx').on(table.userId),
    storyDateIdx: index('stories_date_idx').on(table.storyDate),
  })
);

export const secrets = sqliteTable(
  'secrets',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    personId: text('person_id').references(() => people.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    encryptedContent: text('encrypted_content').notNull(),
    encryptionSalt: text('encryption_salt').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('secrets_user_id_idx').on(table.userId),
    personIdIdx: index('secrets_person_id_idx').on(table.personId),
  })
);

export const contactEvents = sqliteTable(
  'contact_events',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    eventType: text('event_type', {
      enum: ['in_person', 'phone', 'video', 'message', 'email', 'social_media'],
    }).notNull(),
    notes: text('notes'),
    location: text('location'),
    duration: integer('duration'),
    eventDate: integer('event_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('contact_events_user_id_idx').on(table.userId),
    personIdIdx: index('contact_events_person_id_idx').on(table.personId),
    eventDateIdx: index('contact_events_date_idx').on(table.eventDate),
  })
);

export const relationshipHistory = sqliteTable(
  'relationship_history',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    connectionId: text('connection_id').references(() => connections.id, { onDelete: 'cascade' }),
    changeType: text('change_type', {
      enum: ['created', 'status_changed', 'qualifier_changed', 'ended', 'reactivated', 'archived'],
    }).notNull(),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    reason: text('reason'),
    notes: text('notes'),
    changedAt: integer('changed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('relationship_history_user_id_idx').on(table.userId),
    connectionIdIdx: index('relationship_history_connection_idx').on(table.connectionId),
  })
);

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    eventType: text('event_type', {
      enum: ['dinner', 'party', 'gathering', 'meeting', 'trip', 'other'],
    }),
    eventDate: integer('event_date', { mode: 'timestamp' }),
    location: text('location'),
    guestIds: text('guest_ids'),
    compatibilityScore: real('compatibility_score'),
    menuSuggestions: text('menu_suggestions'),
    seatingArrangement: text('seating_arrangement'),
    warnings: text('warnings'),
    status: text('status', { enum: ['planned', 'confirmed', 'completed', 'cancelled'] }).default('planned'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('events_user_id_idx').on(table.userId),
    eventDateIdx: index('events_date_idx').on(table.eventDate),
    statusIdx: index('events_status_idx').on(table.status),
  })
);

export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    filePath: text('file_path').notNull(),
    fileType: text('file_type', { enum: ['profile_photo', 'story_image', 'attachment'] }).notNull(),
    personId: text('person_id').references(() => people.id, { onDelete: 'set null' }),
    storyId: text('story_id').references(() => stories.id, { onDelete: 'set null' }),
    thumbnailPath: text('thumbnail_path'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    cloudUrl: text('cloud_url'),
    syncVersion: integer('sync_version').default(1),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('files_user_id_idx').on(table.userId),
    personIdIdx: index('files_person_id_idx').on(table.personId),
    storyIdIdx: index('files_story_id_idx').on(table.storyId),
  })
);

// Export all table types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

export type Relation = typeof relations.$inferSelect;
export type NewRelation = typeof relations.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type Secret = typeof secrets.$inferSelect;
export type NewSecret = typeof secrets.$inferInsert;

export type ContactEvent = typeof contactEvents.$inferSelect;
export type NewContactEvent = typeof contactEvents.$inferInsert;

export type RelationshipHistory = typeof relationshipHistory.$inferSelect;
export type NewRelationshipHistory = typeof relationshipHistory.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
```

---

## 🔐 Phase 1 Implementation (Local Only)

### Creating Local User

```typescript
import { db } from './db';
import { users } from './schema';

// On first app launch
export async function initializeLocalUser(): Promise<string> {
  // Check if user exists
  const existingUser = await db.select().from(users).limit(1);

  if (existingUser.length > 0) {
    return existingUser[0].id;
  }

  // Create local user
  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: null, // Not used in Phase 1
      displayName: 'Me',
      subscriptionTier: 'free',
    })
    .returning();

  return user.id;
}

// Get current user (always returns local user in Phase 1)
export async function getCurrentUserId(): Promise<string> {
  const users = await db.select({ id: users.id }).from(users).limit(1);

  if (users.length === 0) {
    return await initializeLocalUser();
  }

  return users[0].id;
}
```

### Creating People with UserId

```typescript
import { getCurrentUserId } from './auth';

export async function createPerson(data: { name: string; nickname?: string }) {
  const userId = await getCurrentUserId();

  const [person] = await db
    .insert(people)
    .values({
      id: crypto.randomUUID(),
      userId, // Always set
      name: data.name,
      nickname: data.nickname,
      status: 'active',
    })
    .returning();

  return person;
}
```

---

## 🌐 Phase 4+ Implementation (Magic Link Auth)

### Sending Magic Link

```typescript
export async function sendMagicLink(email: string): Promise<void> {
  // 1. Find or create user
  let user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) {
    [user] = await db
      .insert(users)
      .values({
        email,
        displayName: email.split('@')[0],
        subscriptionTier: 'free',
      })
      .returning();
  }

  // 2. Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // 3. Save token
  await db.insert(magicLinkTokens).values({
    userId: user[0].id,
    token,
    email,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });

  // 4. Send email
  await sendEmail({
    to: email,
    subject: 'Your Friends App login link',
    html: `
      <h1>Welcome to Friends!</h1>
      <p>Click the link below to log in:</p>
      <a href="https://app.friends.com/auth/verify?token=${token}">
        Log in to Friends
      </a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
}
```

### Verifying Magic Link

```typescript
export async function verifyMagicLink(token: string): Promise<string | null> {
  // 1. Find valid token
  const [tokenRecord] = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.token, token),
        isNull(magicLinkTokens.usedAt),
        gt(magicLinkTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!tokenRecord) {
    return null; // Invalid or expired
  }

  // 2. Mark token as used
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, tokenRecord.id));

  // 3. Verify user's email
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, tokenRecord.userId));

  // 4. Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');

  await db.insert(sessions).values({
    userId: tokenRecord.userId,
    sessionToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return sessionToken;
}
```

---

## 📋 Migration Strategy

### Phase 1 → Phase 4 Migration

**No schema changes needed!** Just start using the existing fields:

```typescript
// Phase 1: Single local user
const userId = await getCurrentUserId(); // Returns local user ID

// Phase 4: Multi-user
const userId = await getCurrentUserId(); // Returns authenticated user ID from session
```

**Data migration:**
1. All existing data already has `userId`
2. When user creates account with email, their local data is already linked
3. If moving to different device, sync pulls their data

---

## ✅ Summary

### What's Ready for Phase 1:
- ✅ All tables created with `userId`
- ✅ Single local user workflow
- ✅ Relationship lifecycle (active/archived/ended/deceased)
- ✅ Person archival
- ✅ Secrets (encrypted)
- ✅ Contact events
- ✅ 20 core relation types
- ✅ Soft deletes everywhere
- ✅ UUID primary keys
- ✅ Sync metadata fields (unused but ready)

### What's Ready for Phase 4+:
- ✅ Magic link authentication tables
- ✅ Session management
- ✅ Multi-user support (just use the `userId` field)
- ✅ Cloud sync metadata (`syncVersion`, `lastSyncedAt`)
- ✅ Cloud file storage (`cloudUrl`)

### Zero Breaking Changes:
- ✅ Phase 1 uses local user
- ✅ Phase 4 switches to authenticated users
- ✅ All queries work the same (filtered by `userId`)
- ✅ No schema migrations needed

**The schema is future-proof! 🎉**
