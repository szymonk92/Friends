# Relation Types Ontology - Design Discussion

**Updated:** November 7, 2025
**Status:** Implemented (10 Core Relations)

---

## 🎯 The Core Question

**How do we model relationships in a way that is:**
1. ✅ Expressive enough to capture nuanced relationships
2. ✅ Simple enough for AI to extract from stories
3. ✅ Extensible for future use cases (meal planning, gift recommendations)
4. ✅ Easy for users to understand and verify

---

## 🏗️ Three Architectural Approaches

### Approach 1: Fixed Predefined Relations (Simple) ⭐

**Philosophy:** Define a small, fixed set of well-understood relations

```
Person → KNOWS → Person
Person → LIKES → Thing
Person → DISLIKES → Thing
Person → OWNS → Thing
Person → WORKS_AT → Organization
Person → LIVES_IN → Place
```

**Pros:**
✅ Simple to implement
✅ Easy for AI to extract
✅ Clear semantics
✅ Type-safe in TypeScript

**Cons:**
❌ Limited expressiveness
❌ Hard to extend without code changes
❌ Might miss important relationships

---

### Approach 2: Open Vocabulary (Flexible) 🔧

**Philosophy:** Allow any relation type, let AI extract whatever it finds

```
Person → [any string] → Entity

Examples:
Person → "is married to" → Person
Person → "is allergic to" → Thing
Person → "used to work with" → Person
Person → "dreams of visiting" → Place
```

**Pros:**
✅ Maximum flexibility
✅ Can capture any relationship
✅ No code changes needed for new relations
✅ Natural language friendly

**Cons:**
❌ Inconsistent relation names (synonyms)
❌ Hard to query ("likes" vs "loves" vs "enjoys")
❌ Ambiguous semantics
❌ Type safety challenges

---

### Approach 3: Hierarchical Ontology (Best of Both) 🏆

**Philosophy:** Core relations + extensible sub-types

```
Core Relations (5-10 fixed):
  KNOWS
  LIKES
  DISLIKES
  HAS_SKILL
  ASSOCIATED_WITH

Each core relation has optional qualifiers:
  LIKES(food:ice_cream, confidence:0.95)
  KNOWS(person:Ola, since:2015, strength:0.9)
  HAS_SKILL(skill:cooking, level:expert)
  ASSOCIATED_WITH(place:Italy, type:visited, count:10)
```

**Pros:**
✅ Balance of structure and flexibility
✅ Queryable (group by core relation)
✅ Extensible (qualifiers can be added)
✅ AI-friendly (maps to fixed set)
✅ Type-safe core with flexible metadata

**Cons:**
⚠️ More complex to implement
⚠️ Need clear documentation

**Verdict: RECOMMENDED** ✅

---

## 📊 Proposed Core Relations (Hierarchical Approach)

### Category 1: Social Relationships (Person ↔ Person)

#### KNOWS
**Description:** General acquaintance or relationship between people

**Sub-types:**
- `relationship_type`: friend, family, colleague, acquaintance, partner
- `since`: When they met (date)
- `strength`: 0.0 to 1.0 (calculated from shared experiences)
- `context`: How they know each other (work, school, hobby)

**Examples:**
```
Ola → KNOWS → User
  relationship_type: friend
  since: 2015-11-07
  strength: 0.85
  context: conference

Sarah → KNOWS → Mark
  relationship_type: colleague
  since: 2020-01-15
  strength: 0.6
  context: work
```

**AI Extraction Patterns:**
- "I met [Person] X years ago"
- "[Person] and [Person] are friends"
- "[Person] works with [Person]"
- "[Person] is my [relationship]"

---

### Category 2: Preferences (Person ↔ Thing)

#### LIKES
**Description:** Positive preference or affinity

**Sub-types by category:**
- `category`: food, activity, travel, entertainment, other
- `item`: The specific thing they like
- `confidence`: 0.0 to 1.0 (AI confidence)
- `intensity`: mild, moderate, strong, passionate
- `verified`: boolean (user confirmed)

**Examples:**
```
Ola → LIKES → ice_cream
  category: food
  confidence: 0.95
  intensity: strong
  source_story: "we always eat ice cream"

Sarah → LIKES → hiking
  category: activity
  confidence: 0.9
  intensity: moderate
  source_story: "Sarah loved the trail"
```

**AI Extraction Patterns:**
- "[Person] loves [Thing]"
- "[Person] always eats [Food]"
- "[Person] enjoys [Activity]"
- "[Person] is passionate about [Thing]"

#### DISLIKES
**Description:** Negative preference or aversion

**Sub-types:**
- `category`: Same as LIKES
- `item`: The thing they dislike
- `confidence`: 0.0 to 1.0
- `severity`: mild, moderate, strong, extreme
- `reason`: Optional context (allergy, preference, ethics)

**Examples:**
```
Sarah → DISLIKES → nuts
  category: food
  severity: extreme
  reason: allergy
  confidence: 1.0

John → DISLIKES → horror_movies
  category: entertainment
  severity: moderate
  reason: preference
  confidence: 0.8
```

**AI Extraction Patterns:**
- "[Person] hates [Thing]"
- "[Person] doesn't like [Thing]"
- "[Person] is allergic to [Thing]"
- "[Person] avoids [Thing]"

---

### Category 3: Skills & Expertise (Person ↔ Knowledge)

#### HAS_SKILL
**Description:** Competency or expertise in a domain

**Sub-types:**
- `skill`: Name of the skill
- `level`: beginner, intermediate, advanced, expert, master
- `domain`: cooking, programming, sports, arts, languages, etc.
- `confidence`: 0.0 to 1.0

**Examples:**
```
Mark → HAS_SKILL → baking
  domain: cooking
  level: advanced
  confidence: 0.9
  evidence: "Mark brought his famous cookies"

Lisa → HAS_SKILL → python
  domain: programming
  level: expert
  confidence: 0.95
```

**AI Extraction Patterns:**
- "[Person] is good at [Skill]"
- "[Person] knows how to [Skill]"
- "[Person] is an expert in [Domain]"
- "[Person]'s famous [Thing]" (implies skill)

**Use Cases:**
- Ask for help: "Who knows Python?"
- Dinner parties: "Mark can bring dessert!"
- Gift ideas: "Get Sarah hiking gear"

---

### Category 4: Possessions & Resources (Person ↔ Thing)

#### OWNS
**Description:** Physical or abstract ownership

**Sub-types:**
- `item`: What they own
- `category`: vehicle, pet, property, business, collection
- `since`: When acquired
- `status`: current, past, planning_to_acquire

**Examples:**
```
Tom → OWNS → tesla_model_3
  category: vehicle
  since: 2022-06
  status: current

Emma → OWNS → golden_retriever
  category: pet
  name: "Max"
  since: 2020-03
```

**AI Extraction Patterns:**
- "[Person] has a [Thing]"
- "[Person] owns [Thing]"
- "[Person] bought a [Thing]"
- "[Person] got a [Pet]"

**Use Cases:**
- "Who has a car?" (trip planning)
- "Who has a dog?" (park meetups)
- "Who collects vinyl?" (gift ideas)

---

### Category 5: Location Associations (Person ↔ Place)

#### ASSOCIATED_WITH (Place)

**Description:** Connection to a location

**Sub-types:**
- `place`: Location name
- `type`: lived, lives, visited, works_at, studies_at, born_in, dreams_of
- `timeframe`: When (date or date range)
- `frequency`: once, multiple, regular
- `count`: Number of visits (for visited)

**Examples:**
```
Ola → ASSOCIATED_WITH → Italy
  type: visited
  frequency: multiple
  count: 10
  timeframe: 2015-2024

User → ASSOCIATED_WITH → Italy
  type: visited
  frequency: multiple
  count: 10
  shared_with: Ola

Sarah → ASSOCIATED_WITH → San_Francisco
  type: lives
  since: 2019-03
```

**AI Extraction Patterns:**
- "[Person] lives in [Place]"
- "We went to [Place]"
- "[Person] has been to [Place] X times"
- "[Person] works at [Place]"
- "[Person] was born in [Place]"

**Use Cases:**
- "Who's been to Italy?" (travel tips)
- "Who lives in SF?" (meetups)
- "Where has [Person] traveled?"

---

### Category 6: Experiences (Person ↔ Event)

#### EXPERIENCED
**Description:** Participated in or attended an event/activity

**Sub-types:**
- `event`: Event or activity name
- `type`: activity, milestone, celebration, achievement
- `date`: When it happened
- `location`: Where
- `with`: List of other people
- `role`: participant, organizer, attendee

**Examples:**
```
User → EXPERIENCED → italy_trip_2020
  type: activity
  date: 2020-06-15 to 2020-06-29
  location: Italy
  with: [Ola]
  activities: [sightseeing, dining, museums]

Mark → EXPERIENCED → hiking_2024
  type: activity
  date: 2024-10-15
  location: Lake Trail
  with: [Sarah, User]
  role: participant
```

**AI Extraction Patterns:**
- "We went to [Place] together"
- "[Person] and I did [Activity]"
- "[Person] attended [Event]"
- "We celebrated [Milestone]"

---

### Category 7: Dietary & Health (Person ↔ Constraint)

#### HAS_DIETARY_RESTRICTION
**Description:** Food-related constraints or preferences

**Sub-types:**
- `restriction`: The constraint
- `type`: allergy, intolerance, preference, religious, ethical
- `severity`: mild, moderate, severe, life_threatening
- `since`: When it started
- `verified`: boolean

**Examples:**
```
Sarah → HAS_DIETARY_RESTRICTION → vegetarian
  type: ethical
  since: 2024-01
  verified: true

Emma → HAS_DIETARY_RESTRICTION → nuts
  type: allergy
  severity: life_threatening
  verified: true
```

**AI Extraction Patterns:**
- "[Person] is vegetarian"
- "[Person] is allergic to [Food]"
- "[Person] doesn't eat [Food]"
- "[Person] can't have [Food]"

**Use Cases:**
- Meal planning: "Can [Person] eat this?"
- Restaurant selection
- Grocery shopping

---

### Category 8: Temporal (Person ↔ Date)

#### HAS_IMPORTANT_DATE
**Description:** Significant dates to remember

**Sub-types:**
- `date`: The date (full or recurring)
- `type`: birthday, anniversary, work_anniversary, memorial
- `recurring`: boolean
- `send_reminder`: boolean

**Examples:**
```
Ola → HAS_IMPORTANT_DATE → birthday
  date: 05-15 (May 15, recurring)
  type: birthday
  send_reminder: true

User+Ola → HAS_IMPORTANT_DATE → friendship_anniversary
  date: 2015-11-07
  type: anniversary
  recurring: true
  context: "Met at conference"
```

**AI Extraction Patterns:**
- "[Person]'s birthday is [Date]"
- "We met on [Date]"
- "[Person] started working on [Date]"

---

### Category 9: Identity & Attributes (Person ↔ Identity)

#### IS
**Description:** Core identity attributes, characteristics, professions, beliefs, or categorical memberships

**Sub-types by category:**
- `category`: profession, religion, nationality, identity, lifestyle, condition, role
- `attribute`: The specific identity or attribute
- `confidence`: 0.0 to 1.0 (AI confidence)
- `since`: When this became true (optional)
- `verified`: boolean (user confirmed)
- `context`: Additional context or qualifier

**Examples:**
```
Sarah → IS → doctor
  category: profession
  confidence: 1.0
  since: 2018-06
  verified: true
  context: "pediatrician"

Mark → IS → catholic
  category: religion
  confidence: 0.95
  verified: false
  context: "mentioned attending church"

Emma → IS → vegetarian
  category: lifestyle
  since: 2024-01
  confidence: 1.0
  verified: true

Tom → IS → Brazilian
  category: nationality
  confidence: 1.0
  verified: true

Lisa → IS → parent
  category: role
  confidence: 1.0
  context: "has two children"

John → IS → diabetic
  category: condition
  confidence: 1.0
  verified: true
  context: "Type 2"
```

**AI Extraction Patterns:**
- "[Person] is a [Profession]"
- "[Person] is [Religion/Nationality/Identity]"
- "[Person] works as a [Job]"
- "[Person] has [Condition]"
- "[Person] identifies as [Identity]"

**Use Cases:**
- Professional networking: "Who's a doctor?"
- Event planning: "Consider dietary restrictions (vegetarians)"
- Understanding context: "Remember John needs sugar-free options"
- Gift recommendations: "Religious considerations for gifts"
- Conversation starters: "Ask Sarah about her medical career"

---

### Category 10: Beliefs & Opinions (Person ↔ Belief)

#### BELIEVES
**Description:** Opinions, beliefs, values, and perspectives a person holds

**Sub-types by category:**
- `category`: political, social, environmental, philosophical, personal, value
- `belief`: The specific belief or opinion
- `intensity`: weak, moderate, strong, very_strong
- `confidence`: 0.0 to 1.0 (AI confidence)
- `context`: Additional context or evidence
- `since`: When this belief was mentioned (optional)

**Examples:**
```
Sarah → BELIEVES → climate_action_important
  category: environmental
  intensity: very_strong
  confidence: 0.95
  context: "Sarah is passionate about reducing carbon footprint"

Mark → BELIEVES → education_access
  category: social
  intensity: strong
  confidence: 0.9
  context: "volunteers at literacy programs"

Emma → BELIEVES → work_life_balance
  category: personal
  intensity: strong
  confidence: 0.85
  context: "left corporate job for better balance"

Tom → BELIEVES → privacy_rights
  category: political
  intensity: moderate
  confidence: 0.8
  context: "mentioned concerns about data collection"

Lisa → BELIEVES → family_first
  category: value
  intensity: very_strong
  confidence: 1.0
  context: "always prioritizes family time"
```

**AI Extraction Patterns:**
- "[Person] thinks [Opinion]"
- "[Person] believes [Belief]"
- "[Person] is passionate about [Cause]"
- "[Person] values [Value]"
- "[Person] cares deeply about [Topic]"
- "[Person] mentioned that [Opinion]"

**Use Cases:**
- Conversation topics: "Emma cares about work-life balance"
- Gift ideas: "Get Sarah something eco-friendly"
- Event planning: "Avoid controversial topics with Tom"
- Understanding values: "Remember Mark volunteers for education"
- Building connections: "Introduce people with shared values"

---

## 🔄 Derived Relations (Computed, Not Stored)

These are calculated from other relations:

### INDIRECTLY_KNOWS
**Description:** Friend-of-friend connections

**Computed from:**
```sql
SELECT p2.*
FROM connections c1
JOIN connections c2 ON c1.person_2_id = c2.person_1_id
WHERE c1.person_1_id = 'user-id'
  AND c2.person_2_id != 'user-id'
```

**Use Cases:**
- Networking: "Who can introduce me to X?"
- Events: "Who should I invite who knows each other?"

### SHARED_INTERESTS
**Description:** People with similar preferences

**Computed from:**
```sql
SELECT p2.*, COUNT(*) as shared_count
FROM people p1
JOIN preferences pref1 ON p1.id = pref1.person_id
JOIN preferences pref2 ON pref1.item = pref2.item
JOIN people p2 ON pref2.person_id = p2.id
WHERE p1.id = 'person-id'
  AND p2.id != 'person-id'
GROUP BY p2.id
ORDER BY shared_count DESC
```

**Use Cases:**
- Introductions: "You two would get along!"
- Group activities: "Who likes hiking?"

### RELATIONSHIP_STRENGTH
**Description:** How close two people are

**Computed from:**
- Number of shared stories
- Frequency of mention
- Time known
- Shared preferences
- Common connections

**Formula:**
```typescript
strength = (
  shared_stories * 0.4 +
  time_known_years / 20 * 0.2 +
  shared_preferences / 10 * 0.2 +
  mention_frequency * 0.2
)
```

---

## 🎨 Implementation in Different Architectures

### Option A: RDF/Turtle

```turtle
@prefix : <http://friends.app/ontology#> .

# Define relations
:KNOWS a rdf:Property ;
  rdfs:domain :Person ;
  rdfs:range :Person .

:LIKES a rdf:Property ;
  rdfs:domain :Person ;
  rdfs:range :Thing .

# Use with qualifiers
:person/ola :KNOWS :person/user ;
  :since "2015-11-07"^^xsd:date ;
  :strength "0.85"^^xsd:decimal ;
  :relationshipType "friend" .

:person/ola :LIKES :preference/ice-cream ;
  :category "food" ;
  :confidence "0.95"^^xsd:decimal ;
  :intensity "strong" .

:person/sarah :HAS_DIETARY_RESTRICTION :restriction/vegetarian ;
  :type "ethical" ;
  :since "2024-01"^^xsd:date .
```

### Option B: SQLite + Drizzle

```typescript
// Generic relations table approach
export const relations = sqliteTable('relations', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull(), // Person
  relationType: text('relation_type', {
    enum: ['KNOWS', 'LIKES', 'DISLIKES', 'HAS_SKILL', 'OWNS',
           'ASSOCIATED_WITH', 'EXPERIENCED', 'HAS_DIETARY_RESTRICTION',
           'HAS_IMPORTANT_DATE'],
  }).notNull(),
  objectId: text('object_id').notNull(), // Person, Thing, Place, etc.
  metadata: text('metadata', { mode: 'json' }).$type<{
    category?: string;
    confidence?: number;
    since?: string;
    strength?: number;
    [key: string]: any;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  subjectIdx: index('relations_subject_idx').on(table.subjectId),
  objectIdx: index('relations_object_idx').on(table.objectId),
  typeIdx: index('relations_type_idx').on(table.relationType),
}));

// Or specific tables for each relation type (more type-safe)
export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => people.id),
  category: text('category', {
    enum: ['food', 'activity', 'travel', 'entertainment', 'other'],
  }).notNull(),
  item: text('item').notNull(),
  confidence: real('confidence').notNull(),
  intensity: text('intensity', {
    enum: ['mild', 'moderate', 'strong', 'passionate'],
  }),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  sourceStoryId: text('source_story_id').references(() => stories.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const knows = sqliteTable('knows', {
  id: text('id').primaryKey(),
  person1Id: text('person_1_id').notNull().references(() => people.id),
  person2Id: text('person_2_id').notNull().references(() => people.id),
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
  }),
  since: integer('since', { mode: 'timestamp' }),
  strength: real('strength').default(0.5),
  context: text('context'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 🤖 AI Extraction Strategy

### Prompt Template for Relation Extraction

```typescript
const extractionPrompt = `
You are an AI that extracts relationship data from personal stories.

Extract the following relation types:
1. KNOWS: Social relationships between people
2. LIKES: Things people enjoy or prefer
3. DISLIKES: Things people avoid or dislike
4. HAS_SKILL: Competencies or expertise
5. OWNS: Possessions
6. ASSOCIATED_WITH: Location connections
7. EXPERIENCED: Events and activities
8. HAS_IMPORTANT_DATE: Important dates to remember
9. IS: Identity attributes (profession, religion, nationality, lifestyle, etc.)
10. BELIEVES: Opinions, beliefs, values, and perspectives

Story: "${storyText}"

Return JSON with this structure:
{
  "people": [
    { "name": "Ola", "mentioned": true }
  ],
  "relations": [
    {
      "type": "KNOWS",
      "subject": "User",
      "object": "Ola",
      "metadata": {
        "since": "2015-11-07",
        "relationshipType": "friend",
        "confidence": 1.0
      }
    },
    {
      "type": "LIKES",
      "subject": "Ola",
      "object": "ice cream",
      "metadata": {
        "category": "food",
        "confidence": 0.95,
        "intensity": "strong",
        "evidence": "we always eat ice cream"
      }
    },
    {
      "type": "ASSOCIATED_WITH",
      "subject": "Ola",
      "object": "Italy",
      "metadata": {
        "type": "visited",
        "frequency": "multiple",
        "count": 10,
        "shared_with": ["User"],
        "confidence": 1.0
      }
    }
  ]
}
`;
```

### Confidence Scoring

```typescript
// High confidence (0.9-1.0): Explicit statements
"Ola loves ice cream" → LIKES(ice cream, confidence: 1.0)

// Medium confidence (0.7-0.89): Implied
"Ola always orders vanilla" → LIKES(vanilla, confidence: 0.8)

// Low confidence (0.5-0.69): Inferred
"Ola smiled at the dessert menu" → LIKES(desserts, confidence: 0.6)
```

---

## 🎯 Recommended Minimal Set for MVP

### Core 5 Relations (Start Here)

1. **KNOWS** - Social graph
2. **LIKES** - Positive preferences
3. **DISLIKES** - Negative preferences (dietary restrictions)
4. **ASSOCIATED_WITH** - Places
5. **EXPERIENCED** - Shared activities

**Why these 5?**
- ✅ Cover 90% of use cases
- ✅ AI can extract reliably
- ✅ Enable meal planning & gift recommendations
- ✅ Simple to explain to users

### Add Later (Phase 2)

6. **HAS_SKILL** - For task delegation
7. **OWNS** - For resource sharing
8. **HAS_IMPORTANT_DATE** - For reminders

---

## 🔍 Edge Cases & Considerations

### 1. Temporal Relations
**Problem:** Preferences change over time

**Solution:** Add `valid_from` and `valid_to` timestamps
```typescript
Sarah → LIKES → meat
  valid_from: 2010-01-01
  valid_to: 2024-01-01

Sarah → DISLIKES → meat
  valid_from: 2024-01-01
  valid_to: null (current)
  reason: "became vegetarian"
```

### 2. Intensity/Degree
**Problem:** "likes" vs "loves" vs "obsessed with"

**Solution:** Use intensity qualifier
```typescript
intensity: 'mild' | 'moderate' | 'strong' | 'passionate'
```

### 3. Negation
**Problem:** "Sarah used to like meat but is now vegetarian"

**Solution:** Store both with temporal info
```typescript
LIKES(meat, valid_to: 2024-01-01)
DISLIKES(meat, valid_from: 2024-01-01, reason: 'ethical')
```

### 4. Conditional Preferences
**Problem:** "John likes pizza but only with thin crust"

**Solution:** Hierarchical items or qualifiers
```typescript
LIKES(pizza, qualifier: 'thin_crust_only')
// Or separate:
LIKES(thin_crust_pizza)
DISLIKES(thick_crust_pizza)
```

### 5. Shared Relations
**Problem:** "Ola and I both love Italy"

**Solution:** Link to shared experiences
```typescript
Ola → LIKES → Italy
User → LIKES → Italy
Both → EXPERIENCED → italy_trips(count: 10)
```

---

## 📊 Comparison Table

| Relation | Subject | Object | Use Case | AI Extract | Priority |
|----------|---------|--------|----------|------------|----------|
| **KNOWS** | Person | Person | Social graph, intros | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **LIKES** | Person | Thing | Gifts, meals, activities | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **DISLIKES** | Person | Thing | Avoid mistakes, allergies | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **ASSOCIATED_WITH** | Person | Place | Travel tips, meetups | ⭐⭐⭐⭐ | 🔴 MVP |
| **EXPERIENCED** | Person | Event | Shared memories, context | ⭐⭐⭐⭐ | 🔴 MVP |
| **HAS_SKILL** | Person | Skill | Ask for help, delegation | ⭐⭐⭐⭐ | 🟡 Phase 2 |
| **OWNS** | Person | Thing | Resource sharing | ⭐⭐⭐ | 🟡 Phase 2 |
| **HAS_IMPORTANT_DATE** | Person | Date | Reminders, celebrations | ⭐⭐⭐ | 🟡 Phase 2 |
| **IS** | Person | Identity | Professional context, understanding background | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **BELIEVES** | Person | Belief | Conversation topics, gift ideas, avoid conflicts | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |

---

## 🎯 Final Recommendation

### Current Implementation: 10 Core Relations

```
Phase 1 (MVP - Essential):
1. KNOWS (person → person) - Social graph
2. LIKES (person → thing) - Positive preferences
3. DISLIKES (person → thing) - Negative preferences, allergies
4. ASSOCIATED_WITH (person → place) - Location connections
5. EXPERIENCED (person → event) - Shared activities

Phase 1.5 (Enhanced - Recently Added):
9. IS (person → identity) - Identity attributes, professions, characteristics
10. BELIEVES (person → belief) - Opinions, values, perspectives

Phase 2 (Advanced):
6. HAS_SKILL (person → skill) - Competencies, expertise
7. OWNS (person → thing) - Possessions
8. HAS_IMPORTANT_DATE (person → date) - Reminders, celebrations
```

### Implementation Approach

**Use Hierarchical Ontology:**
- Fixed core relations (enum in database)
- Flexible metadata (JSON for qualifiers)
- Type-safe in TypeScript
- Extensible for future relations

**Database Schema:**
```typescript
// Option A: Generic relations table (more flexible)
relations(id, subject, type, object, metadata)

// Option B: Specific tables (more type-safe)
likes(id, person_id, category, item, confidence, ...)
knows(id, person1_id, person2_id, relationship_type, ...)
```

**Recommendation:** Start with **Option A** for MVP flexibility, refactor to **Option B** if performance becomes an issue.

---

## 🚀 Next Steps

1. ✅ Agree on MVP relations (5 core types)
2. ✅ Decide: Generic table vs specific tables
3. ✅ Design AI extraction prompts
4. ✅ Implement schema in Drizzle
5. ✅ Build UI for manual relation editing
6. ✅ Test with real stories

---

**Ready to decide? Let's debate!** 🎤
