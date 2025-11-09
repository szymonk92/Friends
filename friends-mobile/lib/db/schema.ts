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

// @ts-expect-error - Circular reference for self-referencing foreign key is valid
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

    // Person Classification & Management
    personType: text('person_type', {
      enum: ['primary', 'mentioned', 'placeholder'],
    }).default('placeholder'),
    dataCompleteness: text('data_completeness', {
      enum: ['minimal', 'partial', 'complete'],
    }).default('minimal'),
    addedBy: text('added_by', {
      enum: ['user', 'ai_extraction', 'auto_created', 'import'],
    }).default('auto_created'),
    importanceToUser: text('importance_to_user', {
      enum: ['unknown', 'peripheral', 'important', 'very_important'],
    }).default('unknown'),

    // De-duplication & Merging
    potentialDuplicates: text('potential_duplicates'),
    // @ts-ignore - Self-reference is valid in Drizzle
    canonicalId: text('canonical_id').references(() => people.id),
    mergedFrom: text('merged_from'),

    // Context for auto-created people
    extractionContext: text('extraction_context'),
    mentionCount: integer('mention_count').default(0),

    status: text('status', {
      enum: ['active', 'archived', 'deceased', 'placeholder', 'merged']
    }).notNull().default('active'),
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
    personTypeIdx: index('people_person_type_idx').on(table.personType),
    importanceIdx: index('people_importance_idx').on(table.importanceToUser),
    canonicalIdIdx: index('people_canonical_id_idx').on(table.canonicalId),
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

export const pendingExtractions = sqliteTable(
  'pending_extractions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    storyId: text('story_id').references(() => stories.id, { onDelete: 'cascade' }),

    // The person this relation is about
    subjectId: text('subject_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
    subjectName: text('subject_name').notNull(), // For display

    // The relation type and object
    relationType: text('relation_type').notNull(),
    objectLabel: text('object_label').notNull(),
    objectType: text('object_type'),

    // Metadata
    intensity: text('intensity'),
    confidence: real('confidence').notNull(), // AI confidence score
    category: text('category'),
    metadata: text('metadata'), // JSON
    status: text('status'),

    // Review status
    reviewStatus: text('review_status', {
      enum: ['pending', 'approved', 'rejected', 'edited'],
    }).notNull().default('pending'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    reviewNotes: text('review_notes'),

    // AI reasoning
    extractionReason: text('extraction_reason'), // Why AI extracted this

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('pending_extractions_user_id_idx').on(table.userId),
    storyIdIdx: index('pending_extractions_story_id_idx').on(table.storyId),
    subjectIdIdx: index('pending_extractions_subject_id_idx').on(table.subjectId),
    reviewStatusIdx: index('pending_extractions_review_status_idx').on(table.reviewStatus),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

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

export type PendingExtraction = typeof pendingExtractions.$inferSelect;
export type NewPendingExtraction = typeof pendingExtractions.$inferInsert;
