# Relationship Lifecycle Management

**Handling relationship changes, breakups, divorces, and person archival**

---

## 🎯 Real-World Problems to Solve

### 1. **Breakups & Divorces**
- Mark and Sarah were married, now divorced
- Should still show in history, but not in "current connections"
- Shouldn't suggest them for events together
- Historical data must be preserved (they had shared memories)

### 2. **Falling Out**
- You had a friend, now you don't talk anymore
- Want to keep memories, but mark relationship as "inactive"
- Don't want reminders to "reach out"

### 3. **Death**
- Someone passed away
- Want to preserve memories forever
- Never show in active lists or event planning
- Special memorial mode

### 4. **Privacy After Breakup**
- Ex-partner's data should be archived but accessible
- Option to completely hide from views
- Can be fully deleted if needed (GDPR compliance)

---

## 📊 Database Schema Updates

### 1. **Enhanced Connections Table**

```typescript
export const connections = sqliteTable('connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  person1Id: text('person1_id').notNull().references(() => people.id),
  person2Id: text('person2_id').notNull().references(() => people.id),

  // Relationship type
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'partner', 'acquaintance'],
  }).notNull(),

  // NEW: Relationship status
  status: text('status', {
    enum: ['active', 'inactive', 'ended', 'complicated'],
  }).notNull().default('active'),

  // Qualifiers
  qualifier: text('qualifier'), // "married", "dating", "siblings", "ex-spouse", "former friend"
  strength: real('strength').default(0.5), // 0.0 to 1.0

  // NEW: Lifecycle timestamps
  startDate: integer('start_date', { mode: 'timestamp' }), // When relationship started
  endDate: integer('end_date', { mode: 'timestamp' }), // When relationship ended

  // NEW: End reason
  endReason: text('end_reason', {
    enum: ['divorce', 'breakup', 'falling_out', 'death', 'lost_touch', 'other'],
  }),

  // NEW: Privacy settings
  hideFromSuggestions: integer('hide_from_suggestions', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // Soft delete (can be restored)
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});
```

### 2. **Enhanced People Table**

```typescript
export const people = sqliteTable('people', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nickname: text('nickname'),

  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
  }),

  metDate: integer('met_date', { mode: 'timestamp' }),
  photoUri: text('photo_uri'),

  // NEW: Person status
  status: text('status', {
    enum: ['active', 'archived', 'deceased'],
  }).notNull().default('active'),

  // NEW: Archive reason
  archiveReason: text('archive_reason', {
    enum: ['no_longer_in_touch', 'moved_away', 'deceased', 'breakup', 'other'],
  }),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),

  // NEW: Deceased handling
  dateOfDeath: integer('date_of_death', { mode: 'timestamp' }),

  // NEW: Privacy/visibility
  hideFromActiveViews: integer('hide_from_active_views', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // Soft delete (can be restored)
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});
```

### 3. **Relationship History Table (NEW)**

Track all relationship changes over time:

```typescript
export const relationshipHistory = sqliteTable('relationship_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  connectionId: text('connection_id').notNull().references(() => connections.id),

  // What changed
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

  // Previous and new values
  previousValue: text('previous_value'), // JSON
  newValue: text('new_value'), // JSON

  // Why it changed
  reason: text('reason'),
  notes: text('notes'),

  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 🔄 Relationship Lifecycle States

### State Diagram

```
┌─────────┐
│ ACTIVE  │ ──┐
└─────────┘   │
     │        │
     ▼        │
┌──────────┐  │
│COMPLICATED│ │ (can reactivate)
└──────────┘  │
     │        │
     ▼        │
┌──────────┐  │
│ INACTIVE │ ─┘
└──────────┘
     │
     ▼
┌─────────┐
│  ENDED  │ (permanent)
└─────────┘
```

### Status Meanings

| Status | Meaning | Show in Active Views? | Suggest for Events? |
|--------|---------|----------------------|---------------------|
| **active** | Current relationship | ✅ Yes | ✅ Yes |
| **inactive** | Not in touch, but not ended | ⚠️ Optional | ❌ No |
| **complicated** | It's complicated | ⚠️ Optional | ❌ No |
| **ended** | Relationship over | ❌ No | ❌ No |

---

## 💔 Handling Breakups & Divorces

### UI Flow: "Mark Relationship as Ended"

```
╔═══════════════════════════════════════════════════════════════╗
║  Mark & Sarah's Connection                           [⚙️]     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  👤 Mark  ←→  👤 Sarah                                        ║
║  Status: married                                               ║
║  Together since: June 2018                                    ║
║  Shared memories: 24 experiences                              ║
║                                                                 ║
║  [Edit Connection] [Archive Connection] [End Relationship]    ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝

User clicks "End Relationship":

╔═══════════════════════════════════════════════════════════════╗
║  End Relationship: Mark & Sarah                                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  This will mark their relationship as ended.                   ║
║  Their shared memories will be preserved.                      ║
║                                                                 ║
║  Reason (optional):                                            ║
║  ○ Divorce                                                     ║
║  ○ Breakup                                                     ║
║  ○ Falling out                                                 ║
║  ○ Lost touch                                                  ║
║  ○ Other                                                       ║
║                                                                 ║
║  When did the relationship end?                                ║
║  [November 2025_____]                                          ║
║                                                                 ║
║  Notes (private):                                              ║
║  ┌─────────────────────────────────────────────┐             ║
║  │ Amicable divorce, still co-parenting        │             ║
║  └─────────────────────────────────────────────┘             ║
║                                                                 ║
║  WHAT HAPPENS NEXT:                                            ║
║  ✓ They won't appear in "active connections"                  ║
║  ✓ Won't be suggested together for events                     ║
║  ✓ Shared memories are preserved in timeline                  ║
║  ✓ You can still view their individual profiles               ║
║  ✓ Relationship can be reactivated if needed                  ║
║                                                                 ║
║  [Cancel] [End Relationship]                                   ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

### Implementation

```typescript
async function endRelationship(
  connectionId: string,
  endDate: Date,
  reason: 'divorce' | 'breakup' | 'falling_out' | 'lost_touch' | 'other',
  notes?: string
): Promise<void> {
  // 1. Get current connection
  const connection = await db
    .select()
    .from(connections)
    .where(eq(connections.id, connectionId))
    .limit(1);

  if (!connection[0]) throw new Error('Connection not found');

  // 2. Create history entry (before changing)
  await db.insert(relationshipHistory).values({
    id: crypto.randomUUID(),
    connectionId,
    changeType: 'ended',
    previousValue: JSON.stringify({
      status: connection[0].status,
      qualifier: connection[0].qualifier,
    }),
    newValue: JSON.stringify({
      status: 'ended',
      endReason: reason,
    }),
    reason: notes,
    changedAt: new Date(),
  });

  // 3. Update connection
  await db
    .update(connections)
    .set({
      status: 'ended',
      endDate,
      endReason: reason,
      hideFromSuggestions: true, // Don't suggest for events
      qualifier: connection[0].qualifier === 'married' ? 'ex-spouse' :
                 connection[0].qualifier === 'dating' ? 'ex-partner' :
                 'former friend',
      updatedAt: new Date(),
    })
    .where(eq(connections.id, connectionId));

  // 4. Show notification
  showNotification({
    title: 'Relationship ended',
    message: 'Shared memories have been preserved. You can view them in the timeline.',
  });
}
```

---

## 🗄️ Archiving People (Without Deleting)

### Use Cases for Archiving

1. **No longer in touch** - Old college friend, moved away
2. **Ex-partner** - After breakup, want to hide but keep memories
3. **Deceased** - Preserve memories, memorial mode
4. **Temporary** - Someone you'll reconnect with later

### UI Flow: "Archive Person"

```
╔═══════════════════════════════════════════════════════════════╗
║  Alex's Profile                                       [⚙️]     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  [Edit] [Archive] [Delete Permanently]                         ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝

User clicks "Archive":

╔═══════════════════════════════════════════════════════════════╗
║  Archive Alex                                                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Why are you archiving Alex?                                   ║
║                                                                 ║
║  ○ No longer in touch                                          ║
║  ○ Moved away                                                  ║
║  ○ Breakup / relationship ended                                ║
║  ○ Deceased                                                    ║
║  ○ Other                                                       ║
║                                                                 ║
║  WHAT HAPPENS:                                                 ║
║  ✓ Alex won't appear in your active people list               ║
║  ✓ Won't get reminders to reach out                           ║
║  ✓ Won't be suggested for events                              ║
║  ✓ All memories and data are preserved                        ║
║  ✓ Can be unarchived anytime                                  ║
║                                                                 ║
║  WHERE TO FIND ARCHIVED PEOPLE:                                ║
║  • Settings → Archived People                                  ║
║  • Search will still find them                                 ║
║                                                                 ║
║  [Cancel] [Archive Alex]                                       ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

### Implementation

```typescript
async function archivePerson(
  personId: string,
  reason: 'no_longer_in_touch' | 'moved_away' | 'deceased' | 'breakup' | 'other'
): Promise<void> {
  await db
    .update(people)
    .set({
      status: reason === 'deceased' ? 'deceased' : 'archived',
      archiveReason: reason,
      archivedAt: new Date(),
      hideFromActiveViews: true,
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId));

  // Also update all their connections
  await db
    .update(connections)
    .set({
      status: 'inactive',
      hideFromSuggestions: true,
      updatedAt: new Date(),
    })
    .where(
      or(
        eq(connections.person1Id, personId),
        eq(connections.person2Id, personId)
      )
    );

  showNotification({
    title: 'Person archived',
    message: 'You can unarchive them anytime from Settings.',
  });
}
```

---

## 🕊️ Special Handling: Deceased People

### Memorial Mode

```
╔═══════════════════════════════════════════════════════════════╗
║  Grandma Rose 🕊️                                     [⚙️]     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: In loving memory                                     ║
║  1945 - 2024                                                  ║
║                                                                 ║
║  MEMORIES (12):                                                ║
║  ────────────────────────────────────────────────────────────  ║
║  📸 Family reunion - June 2023                                ║
║  📸 Christmas dinner - Dec 2023                               ║
║  📸 Her 79th birthday - April 2024                            ║
║  [View all memories]                                           ║
║                                                                 ║
║  ABOUT:                                                        ║
║  • Loved baking, gardening, reading                           ║
║  • Always made the best apple pie                             ║
║  • Had the most wonderful stories                             ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

**Special behaviors:**
- ✨ Memorial icon (🕊️)
- ❌ Never shows in active views
- ❌ Never suggested for events
- ❌ No "reach out" reminders
- ✅ Special timeline filter: "Memories with [name]"
- ✅ Can add new memories (photos, stories)
- ✅ Optional: Anniversary reminders (birthday, date of death)

```typescript
async function markAsDeceased(personId: string, dateOfDeath: Date): Promise<void> {
  await db
    .update(people)
    .set({
      status: 'deceased',
      dateOfDeath,
      archiveReason: 'deceased',
      hideFromActiveViews: true,
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId));

  showNotification({
    title: 'Memorial mode activated',
    message: 'Their memories will be preserved forever.',
    type: 'info',
  });
}
```

---

## 🔍 Querying with Lifecycle States

### 1. **Get Active People Only**

```typescript
// For main people list
const activePeople = await db
  .select()
  .from(people)
  .where(
    and(
      eq(people.status, 'active'),
      isNull(people.deletedAt)
    )
  )
  .orderBy(desc(people.updatedAt));
```

### 2. **Get Active Connections Only**

```typescript
// For event planning, introduction matcher, etc.
const activeConnections = await db
  .select()
  .from(connections)
  .where(
    and(
      eq(connections.status, 'active'),
      eq(connections.hideFromSuggestions, false),
      isNull(connections.deletedAt)
    )
  );
```

### 3. **Include Archived (Optional Toggle)**

```typescript
// User can toggle "Show archived people"
const allPeople = await db
  .select()
  .from(people)
  .where(
    and(
      or(
        eq(people.status, 'active'),
        showArchived ? eq(people.status, 'archived') : undefined
      ),
      isNull(people.deletedAt)
    )
  );
```

### 4. **Memorial View**

```typescript
// Special view for deceased loved ones
const deceasedPeople = await db
  .select()
  .from(people)
  .where(
    and(
      eq(people.status, 'deceased'),
      isNull(people.deletedAt)
    )
  )
  .orderBy(desc(people.dateOfDeath));
```

---

## 🎯 Event Planner: Smart Exclusions

### Problem: Don't Suggest Divorced/Broken Up People Together

```typescript
async function getEventCompatiblePeople(guestIds: string[]): Promise<IncompatiblePair[]> {
  const incompatiblePairs: IncompatiblePair[] = [];

  // Check all pairs of guests
  for (let i = 0; i < guestIds.length; i++) {
    for (let j = i + 1; j < guestIds.length; j++) {
      const connection = await db
        .select()
        .from(connections)
        .where(
          and(
            or(
              and(
                eq(connections.person1Id, guestIds[i]),
                eq(connections.person2Id, guestIds[j])
              ),
              and(
                eq(connections.person1Id, guestIds[j]),
                eq(connections.person2Id, guestIds[i])
              )
            ),
            eq(connections.status, 'ended'), // Ended relationship
          )
        )
        .limit(1);

      if (connection[0]) {
        incompatiblePairs.push({
          person1Id: guestIds[i],
          person2Id: guestIds[j],
          reason: connection[0].endReason || 'ended',
          endDate: connection[0].endDate,
        });
      }
    }
  }

  return incompatiblePairs;
}

// Use in event planner
async function suggestGuestList(eventId: string, proposedGuests: string[]): Promise<void> {
  const incompatible = await getEventCompatiblePeople(proposedGuests);

  if (incompatible.length > 0) {
    showWarning({
      title: '⚠️ Potential Issue',
      message: `${incompatible[0].person1Name} and ${incompatible[0].person2Name} had a ${incompatible[0].reason}. This might create an awkward situation.`,
      actions: [
        { label: 'Remove one of them', action: () => removeGuest() },
        { label: 'Invite both anyway', action: () => proceedAnyway() },
      ],
    });
  }
}
```

### Warning UI

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Potential Guest List Issue                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Mark and Sarah are both invited, but they divorced in         ║
║  November 2024.                                                ║
║                                                                 ║
║  This might create an uncomfortable situation.                 ║
║                                                                 ║
║  SUGGESTIONS:                                                  ║
║  • Remove Mark from guest list                                 ║
║  • Remove Sarah from guest list                                ║
║  • Create separate events                                      ║
║  • Continue anyway (if they're on good terms)                  ║
║                                                                 ║
║  [Remove Mark] [Remove Sarah] [Continue Anyway]                ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🔄 Reactivating Relationships

### Use Case: Reconnected with Old Friend

```typescript
async function reactivateConnection(connectionId: string): Promise<void> {
  // Get current connection
  const connection = await db
    .select()
    .from(connections)
    .where(eq(connections.id, connectionId))
    .limit(1);

  if (!connection[0]) throw new Error('Connection not found');

  // Create history entry
  await db.insert(relationshipHistory).values({
    id: crypto.randomUUID(),
    connectionId,
    changeType: 'reactivated',
    previousValue: JSON.stringify({ status: connection[0].status }),
    newValue: JSON.stringify({ status: 'active' }),
    reason: 'Reconnected',
    changedAt: new Date(),
  });

  // Update connection
  await db
    .update(connections)
    .set({
      status: 'active',
      hideFromSuggestions: false,
      endDate: null,
      endReason: null,
      updatedAt: new Date(),
    })
    .where(eq(connections.id, connectionId));

  showNotification({
    title: '🎉 Reconnected!',
    message: 'This relationship is now active again.',
  });
}
```

---

## 📱 Settings: Archived People View

```
╔═══════════════════════════════════════════════════════════════╗
║  Settings → Archived People                                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  ARCHIVED (5):                                                 ║
║  ────────────────────────────────────────────────────────────  ║
║  👤 Alex                                     Archived: 3mo ago ║
║     Reason: No longer in touch                                 ║
║     [View Profile] [Unarchive] [Delete Permanently]            ║
║                                                                 ║
║  👤 Rachel                                   Archived: 1yr ago ║
║     Reason: Moved away                                         ║
║     [View Profile] [Unarchive] [Delete Permanently]            ║
║                                                                 ║
║  ────────────────────────────────────────────────────────────  ║
║  DECEASED (1):                                                 ║
║  ────────────────────────────────────────────────────────────  ║
║  🕊️ Grandma Rose                             Passed: 6mo ago  ║
║     1945 - 2024                                                ║
║     [View Memorial] [View Memories]                            ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🛡️ GDPR Compliance: Permanent Deletion

### When User Wants to Completely Remove Someone

```typescript
async function permanentlyDeletePerson(personId: string): Promise<void> {
  // 1. Warn user
  const confirmed = await showConfirmDialog({
    title: '⚠️ Permanent Deletion',
    message: 'This will permanently delete all data for this person, including all memories, photos, and connections. This cannot be undone.',
    confirmText: 'Delete Permanently',
    cancelText: 'Cancel',
    dangerous: true,
  });

  if (!confirmed) return;

  // 2. Delete in order (due to foreign keys)

  // Delete all relations
  await db
    .delete(relations)
    .where(
      or(
        eq(relations.subjectId, personId),
        eq(relations.objectId, personId)
      )
    );

  // Delete all connections
  await db
    .delete(connections)
    .where(
      or(
        eq(connections.person1Id, personId),
        eq(connections.person2Id, personId)
      )
    );

  // Delete relationship history
  const connectionIds = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      or(
        eq(connections.person1Id, personId),
        eq(connections.person2Id, personId)
      )
    );

  for (const conn of connectionIds) {
    await db
      .delete(relationshipHistory)
      .where(eq(relationshipHistory.connectionId, conn.id));
  }

  // Delete contact events
  await db
    .delete(contactEvents)
    .where(eq(contactEvents.personId, personId));

  // Delete secrets
  await db
    .delete(secrets)
    .where(eq(secrets.personId, personId));

  // Delete photos from filesystem
  const person = await db
    .select()
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  if (person[0]?.photoUri) {
    await deletePhotoFile(person[0].photoUri);
  }

  // Finally, delete person
  await db
    .delete(people)
    .where(eq(people.id, personId));

  showNotification({
    title: 'Permanently deleted',
    message: 'All data has been removed.',
  });
}
```

---

## 📊 Relationship Health Tracker Integration

### Modified to Respect Lifecycle States

```typescript
async function getRelationshipsNeedingAttention(): Promise<RelationshipHealth[]> {
  // Only check ACTIVE relationships
  const activePeople = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.status, 'active'), // Only active
        isNull(people.deletedAt)
      )
    );

  const needsAttention: RelationshipHealth[] = [];

  for (const person of activePeople) {
    const health = await calculateRelationshipHealth(person.id);

    if (health.needsAttention) {
      needsAttention.push(health);
    }
  }

  return needsAttention;
}
```

**Won't remind you about:**
- ❌ Archived people
- ❌ Ended relationships
- ❌ Deceased people
- ❌ People marked "hideFromActiveViews"

---

## 🎮 Phase 3 Feature: Relationship Timeline

### Visual Timeline Showing Lifecycle

```
╔═══════════════════════════════════════════════════════════════╗
║  Mark & Sarah's Relationship Timeline                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  2018 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2024          ║
║   │                                              │              ║
║   ● Met at conference                            ● Divorced    ║
║   │                                              │              ║
║   ├─● Started dating (2018-09)                  │              ║
║   │                                              │              ║
║   ├─● Got married (2020-06)                     │              ║
║   │                                              │              ║
║   ├─● Moved to new house (2021-03)              │              ║
║   │                                              │              ║
║   ├─● Had baby (2022-11)                        │              ║
║   │                                              │              ║
║   └─● Separated (2024-03)                       │              ║
║                                                  │              ║
║  Active relationship: 6 years, 3 months ───────▶│              ║
║                                                                 ║
║  SHARED EXPERIENCES (24):                                      ║
║  • 2 international trips                                       ║
║  • 12 dinners hosted                                           ║
║  • 8 concerts attended                                         ║
║  [View all memories]                                           ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## ✅ Summary: Lifecycle Management Strategy

### 1. **Three-Tier Deletion**
- **Archive** - Hide but keep everything (reversible)
- **Soft Delete** - Mark as deleted, can be restored within 30 days
- **Permanent Delete** - Gone forever (GDPR compliance)

### 2. **Relationship States**
- **active** - Current, suggest for events
- **inactive** - Not in touch, don't suggest
- **complicated** - It's complicated
- **ended** - Over, never suggest together

### 3. **Smart Event Planning**
- Check for ended relationships before suggesting guest lists
- Warn about potential awkwardness
- Respect hideFromSuggestions flag

### 4. **Privacy & Respect**
- Memorial mode for deceased (🕊️)
- Ex-partners can be hidden but memories preserved
- No reminders for inactive/archived people
- Full history tracking for audit trail

### 5. **Data Preservation**
- All memories preserved even after relationship ends
- Timeline shows complete history
- Photos and stories remain accessible
- Can export data before permanent deletion

---

## 🚀 Implementation Priority

### Phase 1 MVP:
- [ ] Basic archiving (status field)
- [ ] Soft delete (deletedAt field)
- [ ] Filter active people in queries

### Phase 2:
- [ ] Relationship status (active/inactive/ended)
- [ ] Archive UI with reasons
- [ ] Unarchive functionality
- [ ] Permanent deletion with confirmation

### Phase 3:
- [ ] Relationship history tracking
- [ ] Memorial mode for deceased
- [ ] Event planner compatibility checking
- [ ] Relationship timeline visualization
- [ ] End relationship wizard

---

**This ensures your app handles real-world relationship complexity with grace and respect! 💚**
