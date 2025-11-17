# Implementation Tasks - Friends Application

**Status:** Planning Phase
**Last Updated:** November 7, 2025

---

## 📋 Table of Contents
1. [Relationship Implementation Options](#relationship-implementation-options)
2. [Phase 1: MVP Tasks](#phase-1-mvp-tasks)
3. [Phase 2: Enhanced Intelligence Tasks](#phase-2-enhanced-intelligence-tasks)
4. [Phase 3: Social Features Tasks](#phase-3-social-features-tasks)
5. [Infrastructure & DevOps](#infrastructure--devops)

---

## 🔗 Relationship Implementation Options

### Overview
The core challenge is modeling **relationships** between people, which includes:
- Direct connections (Person A knows Person B)
- Shared experiences (Person A and B went to Italy together)
- Preference similarities (both like ice cream)
- Relationship strength/closeness
- Network effects (who knows whom through others)

### Option 1: PostgreSQL with Junction Tables ⭐ **Recommended for MVP**

#### Architecture
```sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE people (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(50),
  met_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  date DATE,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Junction table for many-to-many relationship
CREATE TABLE story_people (
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, person_id)
);

-- Connection/relationship table
CREATE TABLE connections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  person_1_id UUID REFERENCES people(id),
  person_2_id UUID REFERENCES people(id),
  relationship_type VARCHAR(100),
  strength DECIMAL(3,2), -- 0.00 to 1.00
  discovered_from_story_id UUID REFERENCES stories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT no_self_connection CHECK (person_1_id != person_2_id),
  CONSTRAINT ordered_pair CHECK (person_1_id < person_2_id) -- Avoid duplicates
);

CREATE INDEX idx_connections_person1 ON connections(person_1_id);
CREATE INDEX idx_connections_person2 ON connections(person_2_id);

-- Preferences table
CREATE TABLE preferences (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  category VARCHAR(50), -- 'food', 'activity', 'travel', etc.
  item VARCHAR(255),
  preference_type VARCHAR(20), -- 'likes', 'dislikes'
  confidence DECIMAL(3,2),
  source_story_id UUID REFERENCES stories(id),
  verified_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_preferences_person ON preferences(person_id);
CREATE INDEX idx_preferences_category ON preferences(category);

-- Timeline events
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50), -- 'first_met', 'shared_experience', 'milestone'
  description TEXT,
  event_date DATE,
  location VARCHAR(255),
  source_story_id UUID REFERENCES stories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many for events involving multiple people
CREATE TABLE event_people (
  event_id UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, person_id)
);
```

#### Querying Examples

```sql
-- Find all people connected to a specific person
SELECT p2.*
FROM connections c
JOIN people p2 ON (c.person_2_id = p2.id OR c.person_1_id = p2.id)
WHERE (c.person_1_id = '...' OR c.person_2_id = '...')
  AND p2.id != '...';

-- Find shared experiences between two people
SELECT s.*
FROM stories s
JOIN story_people sp1 ON s.id = sp1.story_id
JOIN story_people sp2 ON s.id = sp2.story_id
WHERE sp1.person_id = '...'
  AND sp2.person_id = '...';

-- Find people with similar preferences
SELECT p2.*, COUNT(*) as shared_preferences
FROM preferences pref1
JOIN preferences pref2 ON pref1.item = pref2.item
  AND pref1.category = pref2.category
  AND pref1.preference_type = pref2.preference_type
JOIN people p2 ON pref2.person_id = p2.id
WHERE pref1.person_id = '...'
  AND p2.id != '...'
GROUP BY p2.id
ORDER BY shared_preferences DESC;
```

#### Pros
✅ **Simple to implement** - Standard relational patterns
✅ **ACID compliance** - Strong consistency guarantees
✅ **Mature tooling** - TypeORM, Prisma, Drizzle ORM
✅ **Cost-effective** - Single database, widely available hosting
✅ **Good for MVP** - Handles moderate complexity well
✅ **Easy backup/restore** - Standard PostgreSQL tools
✅ **JSON support** - Can store extracted data as JSONB for flexibility

#### Cons
❌ **Complex queries for deep traversal** - "Friends of friends" requires recursive CTEs
❌ **Performance at scale** - Graph queries become expensive (100k+ connections)
❌ **Less intuitive for graph operations** - Relationship strength calculations need custom logic
❌ **Query complexity** - Multi-hop relationships require complex JOINs

#### When to Use
- **MVP phase** (current)
- Small to medium datasets (<10k people per user)
- Simple relationship queries (1-2 hops)
- Budget-conscious projects
- Teams familiar with SQL

---

### Option 2: Graph Database (Neo4j) 🚀 **Best for Complex Relationships**

#### Architecture
```cypher
// Node definitions
(:User {id, email, name, created_at})
(:Person {id, name, relationship_type, met_date})
(:Story {id, content, date, location})
(:Preference {category, item, type, confidence})
(:Event {type, description, date, location})

// Relationship definitions
(:User)-[:OWNS]->(:Person)
(:User)-[:WROTE]->(:Story)
(:Person)-[:MENTIONED_IN]->(:Story)
(:Person)-[:KNOWS {strength, since}]->(:Person)
(:Person)-[:LIKES|DISLIKES]->(:Preference)
(:Person)-[:EXPERIENCED]->(:Event)
(:Event)-[:HAPPENED_IN]->(:Story)
(:Person)-[:SHARED_EXPERIENCE {count}]->(:Person)
```

#### Example Queries

```cypher
// Find all connections within 3 degrees
MATCH (p1:Person {id: $personId})-[:KNOWS*1..3]-(p2:Person)
RETURN DISTINCT p2, length(shortestPath((p1)-[:KNOWS*]-(p2))) as degrees

// Find people who like the same things
MATCH (p1:Person {id: $personId})-[:LIKES]->(pref:Preference)<-[:LIKES]-(p2:Person)
RETURN p2, collect(pref.item) as shared_interests

// Calculate relationship strength based on shared experiences
MATCH (p1:Person)-[:MENTIONED_IN]->(s:Story)<-[:MENTIONED_IN]-(p2:Person)
WHERE p1.id = $personId
WITH p2, count(s) as shared_stories
MATCH (p1:Person)-[:EXPERIENCED]->(e:Event)<-[:EXPERIENCED]-(p2)
WHERE p1.id = $personId
WITH p2, shared_stories, count(e) as shared_events
RETURN p2, (shared_stories * 0.6 + shared_events * 0.4) as strength
ORDER BY strength DESC

// Recommend who to invite based on existing connections
MATCH (p1:Person {id: $personId})-[:KNOWS]-(mutual:Person)-[:KNOWS]-(p2:Person)
WHERE NOT (p1)-[:KNOWS]-(p2)
RETURN p2, count(mutual) as mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

#### Pros
✅ **Natural graph modeling** - Relationships are first-class citizens
✅ **Powerful traversal** - Multi-hop queries are simple and fast
✅ **Relationship-centric** - Perfect for "who knows whom" scenarios
✅ **Pattern matching** - Cypher makes complex patterns easy
✅ **Scalable for graph queries** - Optimized for connection traversal
✅ **Real-time recommendations** - Fast similarity calculations
✅ **Visual tooling** - Neo4j Browser for graph visualization

#### Cons
❌ **Additional infrastructure** - Another database to manage
❌ **Learning curve** - Team needs to learn Cypher query language
❌ **Hosting costs** - Neo4j AuraDB or self-hosted setup
❌ **Limited ORM support** - Less mature TypeScript integration
❌ **Overkill for MVP** - Extra complexity early on
❌ **Data duplication** - May need PostgreSQL for transactional data

#### When to Use
- **Phase 2+** (after MVP validation)
- Complex network analysis requirements
- Deep relationship traversal (3+ hops)
- Social features like friend recommendations
- Seating arrangement optimization
- Large-scale relationship data (100k+ connections)

---

### Option 3: Hybrid Approach (PostgreSQL + Neo4j) 🏆 **Best Long-Term**

#### Architecture
```
PostgreSQL (Source of Truth)
├── Users, authentication
├── People (basic info)
├── Stories (content, metadata)
├── Preferences (detailed data)
└── Timeline events

Neo4j (Relationship Layer)
├── Person nodes (lightweight)
├── KNOWS relationships
├── SHARED_EXPERIENCE relationships
└── Computed relationship strengths

Synchronization Layer
├── Write to PostgreSQL first
├── Async sync to Neo4j via events/queue
└── Neo4j used for graph queries only
```

#### Data Flow
```
User creates story
    ↓
PostgreSQL: Save story + people + preferences (ACID)
    ↓
Event queue (Redis/BullMQ)
    ↓
Neo4j sync worker: Update graph relationships
    ↓
Cache invalidation
```

#### Implementation Example

```typescript
// Service layer example
class StoryService {
  async createStory(userId: string, storyData: CreateStoryDto) {
    // 1. Save to PostgreSQL (source of truth)
    const story = await this.db.transaction(async (tx) => {
      const story = await tx.stories.create({
        data: {
          userId,
          content: storyData.content,
          date: storyData.date,
        }
      });

      // Link people
      await tx.storyPeople.createMany({
        data: storyData.peopleIds.map(personId => ({
          storyId: story.id,
          personId,
        }))
      });

      return story;
    });

    // 2. Async sync to Neo4j
    await this.queue.add('sync-to-neo4j', {
      type: 'story-created',
      storyId: story.id,
      peopleIds: storyData.peopleIds,
    });

    return story;
  }

  async getNetworkGraph(personId: string) {
    // Use Neo4j for graph queries
    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(`
        MATCH (p1:Person {id: $personId})-[r:KNOWS]-(p2:Person)
        RETURN p2, r.strength, r.sharedExperiences
        ORDER BY r.strength DESC
      `, { personId });

      return result.records.map(record => ({
        person: record.get('p2').properties,
        strength: record.get('r.strength'),
        sharedExperiences: record.get('r.sharedExperiences'),
      }));
    } finally {
      await session.close();
    }
  }
}
```

#### Pros
✅ **Best of both worlds** - ACID + graph power
✅ **Scalable architecture** - Each DB handles what it's best at
✅ **Incremental adoption** - Start with PostgreSQL, add Neo4j later
✅ **Performance** - Fast transactional writes, fast graph reads
✅ **Flexibility** - Can query either DB based on use case

#### Cons
❌ **Complexity** - Two databases to manage and sync
❌ **Sync overhead** - Need reliable event queue and workers
❌ **Data consistency** - Eventual consistency for graph data
❌ **Cost** - Two database services
❌ **DevOps burden** - More infrastructure to monitor

#### When to Use
- **Phase 2-3** (proven product with users)
- After validating that relationship features drive value
- When graph query performance becomes a bottleneck
- Team has capacity for distributed systems

---

### Option 4: PostgreSQL with Recursive CTEs + Materialized Views

#### Architecture
Same schema as Option 1, but with optimizations:

```sql
-- Recursive query for friend-of-friend
WITH RECURSIVE connection_tree AS (
  -- Base case: direct connections
  SELECT
    person_2_id as connected_person_id,
    1 as degree,
    ARRAY[person_1_id, person_2_id] as path
  FROM connections
  WHERE person_1_id = $personId

  UNION

  -- Recursive case: connections of connections
  SELECT
    c.person_2_id,
    ct.degree + 1,
    ct.path || c.person_2_id
  FROM connection_tree ct
  JOIN connections c ON ct.connected_person_id = c.person_1_id
  WHERE ct.degree < 3  -- Limit depth
    AND NOT (c.person_2_id = ANY(ct.path))  -- Prevent cycles
)
SELECT DISTINCT ON (connected_person_id) *
FROM connection_tree
ORDER BY connected_person_id, degree;

-- Materialized view for relationship strength (updated periodically)
CREATE MATERIALIZED VIEW relationship_strengths AS
SELECT
  person_1_id,
  person_2_id,
  COUNT(DISTINCT sp1.story_id) as shared_stories,
  COUNT(DISTINCT ep1.event_id) as shared_events,
  (COUNT(DISTINCT sp1.story_id) * 0.6 + COUNT(DISTINCT ep1.event_id) * 0.4) as strength
FROM people p1
CROSS JOIN people p2
LEFT JOIN story_people sp1 ON sp1.person_id = p1.id
LEFT JOIN story_people sp2 ON sp2.person_id = p2.id AND sp1.story_id = sp2.story_id
LEFT JOIN event_people ep1 ON ep1.person_id = p1.id
LEFT JOIN event_people ep2 ON ep2.person_id = p2.id AND ep1.event_id = ep2.event_id
WHERE p1.id < p2.id  -- Avoid duplicates
GROUP BY p1.id, p2.id;

CREATE INDEX idx_rel_strength_p1 ON relationship_strengths(person_1_id);
CREATE INDEX idx_rel_strength_p2 ON relationship_strengths(person_2_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY relationship_strengths;
```

#### Pros
✅ **Single database** - Simple infrastructure
✅ **PostgreSQL native** - No new technologies
✅ **Good performance** - With proper indexes and mat views
✅ **Cost-effective** - One database bill

#### Cons
❌ **Complex SQL** - Recursive CTEs are hard to maintain
❌ **Staleness** - Materialized views need refresh strategy
❌ **Scale limits** - Still slower than Neo4j for deep graphs

#### When to Use
- **MVP to Phase 2 transition**
- Want graph features without new infrastructure
- Budget constraints
- Small to medium scale

---

### Option 5: Document Database (MongoDB)

#### Architecture
```javascript
// User collection
{
  _id: ObjectId,
  email: String,
  name: String,
  people: [
    {
      id: String,
      name: String,
      relationship: String,
      preferences: [
        { category: "food", item: "ice cream", type: "likes", confidence: 0.95 }
      ],
      connections: [
        { personId: String, strength: 0.8, sharedExperiences: 12 }
      ]
    }
  ],
  stories: [
    {
      id: String,
      content: String,
      peopleIds: [String],
      extractedData: Object
    }
  ]
}
```

#### Pros
✅ **Flexible schema** - Easy to iterate during prototyping
✅ **Embedded relationships** - Can denormalize for read speed
✅ **JSON-native** - AI extraction fits naturally

#### Cons
❌ **Weak relationship modeling** - Not designed for graphs
❌ **Data duplication** - Hard to maintain consistency
❌ **No ACID across documents** - Risk of inconsistency
❌ **Poor for complex queries** - Aggregation pipelines get messy

#### When to Use
- Rapid prototyping only
- **Not recommended for production**

---

## 🎯 Recommended Approach

### Phase 1 (MVP): PostgreSQL Only
**Why:** Simple, cost-effective, proven. Focus on validating core concept.

**Implementation:**
- PostgreSQL with junction tables
- Prisma ORM for type safety
- Materialized views for common queries
- Redis cache for frequently accessed data

### Phase 2 (Scale): Add Neo4j for Graph Features
**Why:** After validating product-market fit, add Neo4j for advanced network features.

**Implementation:**
- Keep PostgreSQL as source of truth
- Add Neo4j for relationship queries
- Event-driven sync (BullMQ + Redis)
- Use Neo4j for:
  - Network visualization
  - Friend recommendations
  - Seating optimization
  - Meal planning group compatibility

### Phase 3+: Optimize Based on Data
**Why:** Real usage patterns will reveal bottlenecks.

**Possible optimizations:**
- GraphQL with DataLoader for N+1 prevention
- Read replicas for PostgreSQL
- Elasticsearch for advanced search
- Vector database (Pinecone) for semantic story search

---

## Alternative: SQLite for Single-User Desktop App

If you pivot to a **local-first** application:

```typescript
// SQLite with better-sqlite3
import Database from 'better-sqlite3';

const db = new Database('friends.db');

// Same schema as PostgreSQL
// Benefits:
// - No server needed
// - Fast local queries
// - Easy backup (single file)
// - Sync via file-based storage (Dropbox, iCloud)
```

---

## Decision Matrix

| Feature | PostgreSQL | Neo4j | Hybrid | MongoDB |
|---------|-----------|-------|---------|---------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Graph Queries** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **ACID Compliance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Cost (MVP)** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **TypeScript DX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Hosting Options** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 📋 Phase 1: MVP Tasks (PostgreSQL-based)

### 1. Project Setup & Infrastructure

#### 1.1 Repository Setup
- [ ] Initialize monorepo structure (pnpm workspaces or Turborepo)
  ```
  friends/
  ├── apps/
  │   └── web/
  ├── packages/
  │   ├── database/
  │   ├── api-client/
  │   └── ui/
  └── server/
  ```
- [ ] Configure TypeScript with strict mode
- [ ] Setup ESLint + Prettier
- [ ] Configure Git hooks (Husky + lint-staged)
- [ ] Create `.env.example` file

**Estimated Time:** 4 hours

#### 1.2 Backend Foundation
- [ ] Initialize Node.js + Express server
- [ ] Setup TypeScript configuration
- [ ] Install dependencies:
  ```bash
  npm install express cors helmet dotenv
  npm install -D @types/express @types/cors @types/node tsx
  ```
- [ ] Create basic server structure
  ```
  server/src/
  ├── index.ts
  ├── config/
  ├── routes/
  ├── services/
  ├── models/
  ├── middleware/
  └── utils/
  ```
- [ ] Add health check endpoint (`/api/health`)
- [ ] Setup environment variable validation (Zod or env-var)

**Estimated Time:** 6 hours

#### 1.3 Database Setup
- [ ] Install PostgreSQL locally (or use Docker)
- [ ] Install Prisma:
  ```bash
  npm install @prisma/client
  npm install -D prisma
  ```
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Create database schema (see Option 1 above)
- [ ] Run first migration: `npx prisma migrate dev --name init`
- [ ] Setup Prisma Client singleton
- [ ] Create seed script for development data

**Estimated Time:** 8 hours

#### 1.4 Frontend Foundation
- [ ] Initialize React app with Vite:
  ```bash
  npm create vite@latest apps/web -- --template react-ts
  ```
- [ ] Install UI dependencies:
  ```bash
  npm install tailwindcss @tailwindcss/forms
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install react-router-dom zustand react-hook-form zod
  npm install @hookform/resolvers
  ```
- [ ] Setup Tailwind CSS configuration
- [ ] Create base layout components (Header, Sidebar, Layout)
- [ ] Setup routing structure
- [ ] Configure API client (Axios or fetch wrapper)

**Estimated Time:** 8 hours

**Total Estimated Time for Setup:** ~26 hours (~3-4 days)

---

### 2. Authentication System

#### 2.1 Backend Auth
- [ ] Install auth dependencies:
  ```bash
  npm install bcryptjs jsonwebtoken passport passport-jwt
  npm install -D @types/bcryptjs @types/jsonwebtoken @types/passport-jwt
  ```
- [ ] Create User model in Prisma schema
- [ ] Implement password hashing utility
- [ ] Create auth service:
  - [ ] `register(email, password, name)`
  - [ ] `login(email, password)`
  - [ ] `refreshToken(refreshToken)`
- [ ] Create auth routes:
  - [ ] `POST /api/auth/register`
  - [ ] `POST /api/auth/login`
  - [ ] `POST /api/auth/refresh`
  - [ ] `GET /api/auth/me`
  - [ ] `POST /api/auth/logout`
- [ ] Implement JWT middleware for protected routes
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add validation middleware (Zod schemas)

**Estimated Time:** 12 hours

#### 2.2 Frontend Auth
- [ ] Create auth context/store (Zustand)
- [ ] Build auth forms:
  - [ ] Login form with validation
  - [ ] Registration form with validation
  - [ ] Password strength indicator
- [ ] Implement auth API client methods
- [ ] Create protected route wrapper
- [ ] Add token refresh logic
- [ ] Handle auth errors (expired token, invalid credentials)
- [ ] Add "remember me" functionality
- [ ] Create logout functionality

**Estimated Time:** 10 hours

**Total Estimated Time for Auth:** ~22 hours (~3 days)

---

### 3. People Management (CRUD)

#### 3.1 Backend - People API
- [ ] Create Person model in Prisma (if not done)
- [ ] Implement people service:
  - [ ] `createPerson(userId, data)`
  - [ ] `getPersonById(id, userId)`
  - [ ] `getAllPeople(userId, filters)`
  - [ ] `updatePerson(id, userId, data)`
  - [ ] `deletePerson(id, userId)`
  - [ ] `searchPeople(userId, query)`
- [ ] Create people routes:
  - [ ] `GET /api/people` (with pagination, filtering)
  - [ ] `POST /api/people`
  - [ ] `GET /api/people/:id`
  - [ ] `PUT /api/people/:id`
  - [ ] `DELETE /api/people/:id`
  - [ ] `GET /api/people/search?q=...`
- [ ] Add validation (Zod schemas)
- [ ] Add image upload for profile photos (Multer + S3/local storage)
- [ ] Write unit tests

**Estimated Time:** 16 hours

#### 3.2 Frontend - People UI
- [ ] Create people store (Zustand)
- [ ] Build people list view:
  - [ ] Grid/list toggle
  - [ ] Search bar with debounce
  - [ ] Filter by relationship type
  - [ ] Sort options
  - [ ] Pagination or infinite scroll
- [ ] Build person card component
- [ ] Create add person form:
  - [ ] Name, nickname, relationship type
  - [ ] Birthday, met date
  - [ ] Photo upload with preview
  - [ ] Form validation (Zod + React Hook Form)
- [ ] Build person detail page:
  - [ ] Profile header
  - [ ] Tabbed interface (Overview, Preferences, Timeline, Stories)
  - [ ] Edit mode
- [ ] Add delete confirmation modal
- [ ] Implement optimistic updates

**Estimated Time:** 20 hours

**Total Estimated Time for People:** ~36 hours (~4-5 days)

---

### 4. Story Capture & Management

#### 4.1 Backend - Stories API
- [ ] Create Story model in Prisma
- [ ] Create StoryPeople junction table
- [ ] Implement stories service:
  - [ ] `createStory(userId, data)`
  - [ ] `getStoryById(id, userId)`
  - [ ] `getAllStories(userId, filters)`
  - [ ] `updateStory(id, userId, data)`
  - [ ] `deleteStory(id, userId)`
  - [ ] `getStoriesByPerson(personId, userId)`
- [ ] Create stories routes:
  - [ ] `POST /api/stories`
  - [ ] `GET /api/stories`
  - [ ] `GET /api/stories/:id`
  - [ ] `PUT /api/stories/:id`
  - [ ] `DELETE /api/stories/:id`
  - [ ] `GET /api/people/:personId/stories`
- [ ] Add image upload for story attachments
- [ ] Implement auto-save functionality (draft stories)

**Estimated Time:** 14 hours

#### 4.2 Frontend - Story UI
- [ ] Create stories store
- [ ] Build story creator:
  - [ ] Rich text editor (TipTap or Lexical)
  - [ ] People tagging (@mention style autocomplete)
  - [ ] Date picker
  - [ ] Location input
  - [ ] Image upload with preview
  - [ ] Auto-save to drafts
  - [ ] Character count
- [ ] Build story list view:
  - [ ] Timeline-style feed
  - [ ] Filter by person, date range
  - [ ] Search within stories
- [ ] Create story detail view:
  - [ ] Display formatted content
  - [ ] Show linked people
  - [ ] Display extracted data (Phase 1.5)
  - [ ] Edit/delete options
- [ ] Add story card component for lists

**Estimated Time:** 24 hours

**Total Estimated Time for Stories:** ~38 hours (~5 days)

---

### 5. AI Integration & Entity Extraction

#### 5.1 AI Service Setup
- [ ] Install OpenAI SDK: `npm install openai`
- [ ] Create AI service module
- [ ] Setup OpenAI client with API key
- [ ] Create prompt templates:
  - [ ] Entity extraction prompt
  - [ ] Preference extraction prompt
  - [ ] Tag generation prompt
- [ ] Implement fallback handling (API failures)
- [ ] Add request/response logging
- [ ] Implement cost tracking (token usage)
- [ ] Add rate limiting for AI calls

**Estimated Time:** 8 hours

#### 5.2 Entity Extraction Pipeline
- [ ] Create extraction service:
  - [ ] `extractEntitiesFromStory(content)`
  - [ ] `extractPreferences(content, people)`
  - [ ] `extractTimelineEvents(content, people)`
  - [ ] `generateTags(content)`
- [ ] Define extraction response schema (Zod)
- [ ] Implement confidence scoring
- [ ] Create ExtractedData model in Prisma
- [ ] Store extracted data as JSONB
- [ ] Build extraction endpoint: `POST /api/stories/:id/analyze`
- [ ] Implement batch processing for multiple stories
- [ ] Add extraction status tracking
- [ ] Write unit tests with mocked AI responses

**Estimated Time:** 20 hours

#### 5.3 Preferences Management
- [ ] Create Preference model in Prisma
- [ ] Implement preference service:
  - [ ] `savePreference(personId, preference)`
  - [ ] `getPreferences(personId, filters)`
  - [ ] `verifyPreference(preferenceId)` (user confirms)
  - [ ] `deletePreference(preferenceId)`
  - [ ] `updatePreferenceConfidence(preferenceId, confidence)`
- [ ] Create preferences routes:
  - [ ] `GET /api/people/:personId/preferences`
  - [ ] `POST /api/preferences/:id/verify`
  - [ ] `DELETE /api/preferences/:id`
- [ ] Implement preference aggregation (combine from multiple sources)

**Estimated Time:** 12 hours

#### 5.4 Frontend - AI Features
- [ ] Build AI suggestions panel in story creator:
  - [ ] Real-time or on-demand extraction
  - [ ] Loading states
  - [ ] Display extracted people, preferences, tags
  - [ ] Confirm/reject interface
  - [ ] Confidence indicators (color-coded)
- [ ] Create preferences display component:
  - [ ] Categorized lists
  - [ ] Visual confidence indicators
  - [ ] Verify/edit buttons
  - [ ] Source story links
- [ ] Add tag suggestions as user types
- [ ] Build extraction results review modal
- [ ] Show extraction progress/status

**Estimated Time:** 16 hours

**Total Estimated Time for AI:** ~56 hours (~7 days)

---

### 6. Timeline & Events

#### 6.1 Backend - Timeline
- [ ] Create TimelineEvent model
- [ ] Create EventPeople junction table
- [ ] Implement timeline service:
  - [ ] `createEvent(userId, data)`
  - [ ] `getTimeline(userId, filters)`
  - [ ] `getPersonTimeline(personId, userId)`
  - [ ] `updateEvent(eventId, userId, data)`
  - [ ] `deleteEvent(eventId, userId)`
- [ ] Create timeline routes:
  - [ ] `GET /api/timeline`
  - [ ] `GET /api/people/:personId/timeline`
  - [ ] `POST /api/events`
  - [ ] `PUT /api/events/:id`
  - [ ] `DELETE /api/events/:id`

**Estimated Time:** 10 hours

#### 6.2 Frontend - Timeline View
- [ ] Install timeline library or build custom
- [ ] Create timeline component:
  - [ ] Vertical timeline layout
  - [ ] Event nodes with icons by type
  - [ ] Hover details
  - [ ] Click to view full story
  - [ ] Filter by date range, event type, person
  - [ ] Zoom controls
- [ ] Build event card component
- [ ] Add timeline to person detail page

**Estimated Time:** 14 hours

**Total Estimated Time for Timeline:** ~24 hours (~3 days)

---

### 7. Connections & Network Visualization (Basic)

#### 7.1 Backend - Connections
- [ ] Create Connection model in Prisma
- [ ] Implement connection service:
  - [ ] `inferConnections(storyId)` - Auto-detect from stories
  - [ ] `calculateRelationshipStrength(person1Id, person2Id)`
  - [ ] `getConnections(personId, userId)`
  - [ ] `getNetworkGraph(userId, depth)`
- [ ] Create connections routes:
  - [ ] `GET /api/people/:personId/connections`
  - [ ] `GET /api/network` - Full network graph data
  - [ ] `POST /api/connections/recalculate` - Rebuild from stories
- [ ] Implement background job for strength calculation

**Estimated Time:** 12 hours

#### 7.2 Frontend - Network Graph (Simple)
- [ ] Install React Flow or D3.js
- [ ] Create network visualization component:
  - [ ] Nodes for people
  - [ ] Edges for connections
  - [ ] Node sizing by relationship strength
  - [ ] Edge thickness by shared experiences
  - [ ] Color coding by relationship type
  - [ ] Click to view person details
  - [ ] Zoom and pan
  - [ ] Filter controls
- [ ] Build network graph page
- [ ] Add mini network view to dashboard

**Estimated Time:** 20 hours

**Total Estimated Time for Connections:** ~32 hours (~4 days)

---

### 8. Dashboard & Insights

#### 8.1 Backend - Insights API
- [ ] Implement insights service:
  - [ ] `getRecentActivity(userId)` - Recent stories, people added
  - [ ] `getUpcomingEvents(userId)` - Birthdays, anniversaries
  - [ ] `getInterestingFacts(userId)` - Random insights
  - [ ] `getPreferenceClouds(userId)`
  - [ ] `getRelationshipStats(userId)` - Total people, stories, connections
- [ ] Create insights routes:
  - [ ] `GET /api/insights/dashboard`
  - [ ] `GET /api/insights/upcoming`
  - [ ] `GET /api/insights/stats`

**Estimated Time:** 10 hours

#### 8.2 Frontend - Dashboard
- [ ] Create dashboard layout with widgets:
  - [ ] Quick stats (# people, # stories, # connections)
  - [ ] Recent activity feed
  - [ ] Upcoming birthdays/anniversaries
  - [ ] "On this day" (memories from past years)
  - [ ] Top preferences word cloud
  - [ ] Network snapshot
  - [ ] Quick add buttons
- [ ] Build individual widget components
- [ ] Add data refresh on interval
- [ ] Implement skeleton loaders

**Estimated Time:** 16 hours

**Total Estimated Time for Dashboard:** ~26 hours (~3 days)

---

### 9. Search & Filtering

#### 9.1 Backend - Search
- [ ] Implement full-text search in PostgreSQL:
  ```sql
  CREATE INDEX idx_stories_content_fts ON stories
  USING gin(to_tsvector('english', content));
  ```
- [ ] Create search service:
  - [ ] `searchPeople(userId, query, filters)`
  - [ ] `searchStories(userId, query, filters)`
  - [ ] `searchPreferences(userId, query)`
  - [ ] `globalSearch(userId, query)` - Across all entities
- [ ] Create search routes:
  - [ ] `GET /api/search?q=...&type=...`
  - [ ] `GET /api/search/suggestions?q=...`
- [ ] Add search result ranking

**Estimated Time:** 10 hours

#### 9.2 Frontend - Search UI
- [ ] Build global search component:
  - [ ] Search bar in header
  - [ ] Autocomplete suggestions
  - [ ] Search results page with tabs (People, Stories, Preferences)
  - [ ] Highlight matched terms
  - [ ] Recent searches
  - [ ] Search filters sidebar
- [ ] Add search to people list
- [ ] Add search to stories list
- [ ] Implement keyboard shortcuts (Cmd+K)

**Estimated Time:** 14 hours

**Total Estimated Time for Search:** ~24 hours (~3 days)

---

### 10. Polish & MVP Launch Prep

#### 10.1 Testing
- [ ] Write unit tests for critical services
- [ ] Write integration tests for API endpoints
- [ ] Write E2E tests for key user flows (Playwright or Cypress):
  - [ ] Registration → Add person → Create story → View extracted data
- [ ] Test error handling
- [ ] Test edge cases (empty states, long content, special characters)
- [ ] Performance testing (load testing with k6 or Artillery)

**Estimated Time:** 24 hours

#### 10.2 UI/UX Polish
- [ ] Implement loading states everywhere
- [ ] Add error boundaries
- [ ] Create empty states with helpful CTAs
- [ ] Add success/error toast notifications
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Add keyboard shortcuts
- [ ] Implement dark mode (optional for MVP)
- [ ] Accessibility audit (a11y):
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] Color contrast
  - [ ] Focus indicators

**Estimated Time:** 20 hours

#### 10.3 Documentation
- [ ] Write API documentation (Swagger/OpenAPI)
- [ ] Create user guide/help section
- [ ] Document deployment process
- [ ] Create developer setup guide
- [ ] Add inline code comments
- [ ] Create architecture diagrams

**Estimated Time:** 12 hours

#### 10.4 Deployment
- [ ] Setup production database (Railway, Render, Neon)
- [ ] Deploy backend (Railway, Render, Fly.io)
- [ ] Deploy frontend (Vercel, Netlify)
- [ ] Configure environment variables
- [ ] Setup SSL certificates
- [ ] Configure CORS for production
- [ ] Setup error monitoring (Sentry)
- [ ] Setup analytics (PostHog, Mixpanel)
- [ ] Configure backup strategy for database
- [ ] Create deployment CI/CD pipeline (GitHub Actions)

**Estimated Time:** 16 hours

**Total Estimated Time for Polish:** ~72 hours (~9 days)

---

## 📊 Phase 1 Summary

| Category | Tasks | Estimated Time |
|----------|-------|----------------|
| Project Setup | 4 | 26 hours |
| Authentication | 11 | 22 hours |
| People Management | 20 | 36 hours |
| Story Capture | 18 | 38 hours |
| AI Integration | 27 | 56 hours |
| Timeline | 11 | 24 hours |
| Connections | 14 | 32 hours |
| Dashboard | 10 | 26 hours |
| Search | 11 | 24 hours |
| Polish & Launch | 24 | 72 hours |
| **TOTAL** | **150 tasks** | **~356 hours** |

**Estimated Calendar Time:** 8-10 weeks (1-2 developers)

---

## 🚀 Phase 2: Enhanced Intelligence Tasks

*(Coming in separate document after Phase 1 completion)*

### High-Level Goals
- [ ] Implement Neo4j for advanced network features
- [ ] Add real-time collaboration
- [ ] Advanced AI insights (relationship predictions, conversation starters)
- [ ] Mobile-responsive optimizations
- [ ] Performance optimization
- [ ] Scale to 1,000 users

---

## 📱 Phase 3: Social Features Tasks

### Meal Planning Assistant
- [ ] Design meal planning UI
- [ ] Implement dietary restriction aggregation
- [ ] Build recipe suggestion algorithm
- [ ] Create menu builder
- [ ] Add shopping list generator
- [ ] Test with diverse dietary needs

### Seating Arrangement Optimizer
- [ ] Design table layout editor
- [ ] Implement compatibility scoring algorithm
- [ ] Build drag-and-drop seating UI
- [ ] Add reason explanations
- [ ] Test with various group sizes

### Gift Recommendation Engine
- [ ] Implement preference-based recommendations
- [ ] Add gift history tracking
- [ ] Integrate with shopping APIs (optional)
- [ ] Build gift idea UI
- [ ] Add budget filtering

---

## 📱 Phase 4: Mobile App Tasks

### Expo React Native Setup
- [ ] Initialize Expo project
- [ ] Setup monorepo for code sharing
- [ ] Create shared packages (types, API client, business logic)
- [ ] Implement native navigation
- [ ] Setup push notifications
- [ ] Implement offline support (SQLite + sync)
- [ ] Add camera integration for photos
- [ ] Integrate with device contacts
- [ ] Build app store listings
- [ ] Submit to App Store and Play Store

---

## 🔧 Infrastructure & DevOps

### Monitoring & Observability
- [ ] Setup error tracking (Sentry)
- [ ] Implement logging (Winston, Pino)
- [ ] Add performance monitoring (APM)
- [ ] Create dashboards (Grafana)
- [ ] Setup uptime monitoring
- [ ] Configure alerts (PagerDuty, email)

### Security
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Setup security headers (Helmet.js)
- [ ] Conduct security audit
- [ ] Implement GDPR compliance features
- [ ] Add data export functionality
- [ ] Implement account deletion

### Scalability
- [ ] Add database connection pooling
- [ ] Implement caching layer (Redis)
- [ ] Setup CDN for assets
- [ ] Add database read replicas
- [ ] Implement horizontal scaling
- [ ] Load testing and optimization

---

## 📝 Notes

### Tech Debt to Address Later
- Consider switching to tRPC for end-to-end type safety
- Evaluate GraphQL if many N+1 query issues arise
- Consider server-side rendering (Next.js) if SEO becomes important
- Evaluate edge functions for global performance

### Future Explorations
- **Voice input:** Record stories via voice, transcribe with Whisper API
- **Browser extension:** Capture social media interactions automatically
- **Calendar integration:** Remind about upcoming events
- **Email integration:** Extract info from emails (with permission)
- **AI chat interface:** Ask questions about your network ("Who likes sushi?")

---

**Last Updated:** November 7, 2025
**Next Review:** After Phase 1 completion
