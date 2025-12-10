# Data Layer Capability Analysis

**Question:** Can SQLite + Drizzle and RDF/Turtle handle all visualization use cases?

**Answer:** ✅ YES! Both can handle everything, but with different trade-offs.

---

## 🎯 Capability Matrix

| Visualization Use Case | SQLite + Drizzle | RDF/Turtle | Complexity |
|------------------------|------------------|------------|------------|
| Person Detail View | ✅ Easy | ✅ Easy | Low |
| Network Graph | ✅ Medium (recursive CTEs) | ✅ Easy (native) | Medium |
| Preferences Matrix | ✅ Easy (JOINs) | ✅ Easy (SPARQL) | Low |
| Timeline View | ✅ Easy (ORDER BY) | ✅ Easy (ORDER BY) | Low |
| Skills Search | ✅ Easy (WHERE clause) | ✅ Easy (FILTER) | Low |
| Meal Planning | ✅ Easy (aggregation) | ✅ Easy (aggregation) | Medium |
| Gift Ideas | ✅ Medium (complex JOINs) | ✅ Easy (graph patterns) | Medium |
| Relationship Strength | ✅ Medium (computed) | ✅ Easy (graph metrics) | High |

**Verdict:** Both work, but **SQLite is simpler for Phase 1**, **RDF is better for complex graph queries**.

---

## 📊 Detailed Query Examples

### Use Case 1: Person Detail View

**Requirement:** Show all info about Ola (connections, preferences, skills, dates, etc.)

#### SQLite + Drizzle

```typescript
// Get person with all relations
async function getPersonDetail(personId: string) {
  const db = getDatabase();

  // 1. Get person
  const person = await db.query.people.findFirst({
    where: eq(people.id, personId),
  });

  // 2. Get connections (KNOWS relations)
  const connections = await db
    .select({
      person: people,
      qualifier: connections.qualifier,
      since: connections.since,
      strength: connections.strength,
      comment: connections.comment,
    })
    .from(connections)
    .innerJoin(people,
      or(
        eq(connections.person1Id, personId),
        eq(connections.person2Id, personId)
      )
    )
    .where(isNull(connections.deletedAt));

  // 3. Get preferences (LIKES/DISLIKES)
  const preferences = await db
    .select()
    .from(preferences)
    .where(
      and(
        eq(preferences.personId, personId),
        isNull(preferences.deletedAt)
      )
    )
    .orderBy(preferences.category, preferences.item);

  // 4. Get skills
  const skills = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.personId, personId),
        isNull(skills.deletedAt)
      )
    );

  // 5. Get possessions (OWNS)
  const possessions = await db
    .select()
    .from(possessions)
    .where(
      and(
        eq(possessions.personId, personId),
        isNull(possessions.deletedAt)
      )
    );

  // 6. Get important dates
  const importantDates = await db
    .select()
    .from(importantDates)
    .where(
      and(
        eq(importantDates.personId, personId),
        isNull(importantDates.deletedAt)
      )
    );

  // 7. Get places (ASSOCIATED_WITH)
  const places = await db
    .select()
    .from(placeAssociations)
    .where(
      and(
        eq(placeAssociations.personId, personId),
        isNull(placeAssociations.deletedAt)
      )
    );

  return {
    person,
    connections,
    preferences,
    skills,
    possessions,
    importantDates,
    places,
  };
}
```

**Performance:** ~7 queries, 10-20ms with indexes

#### RDF/Turtle

```typescript
// SPARQL query to get everything
const query = `
PREFIX : <http://friends.app/ontology#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?relation ?object ?metadata
WHERE {
  # Get all outgoing relations
  :person/ola ?relation ?object .

  # Optionally get metadata
  OPTIONAL {
    ?relation :metadata ?metadata .
  }
}
`;

// Or using RDF pattern matching
const person = FRIENDS('person/ola');
const allRelations = store.getQuads(person, null, null, null);

// Group by relation type
const grouped = {
  knows: allRelations.filter(q => q.predicate.equals(FRIENDS('KNOWS'))),
  likes: allRelations.filter(q => q.predicate.equals(FRIENDS('LIKES'))),
  hasSkill: allRelations.filter(q => q.predicate.equals(FRIENDS('HAS_SKILL'))),
  // ... etc
};
```

**Performance:** ~1 query, 5-10ms (in-memory)

**Winner for this case:** 🏆 **RDF** (simpler, faster)

---

### Use Case 2: Network Graph View

**Requirement:** Get all connections, calculate relationship strength, show "who knows whom"

#### SQLite + Drizzle

```typescript
// Get network graph for user
async function getNetworkGraph(userId: string) {
  const db = getDatabase();

  // 1. Get all people in user's network
  const peopleInNetwork = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        isNull(people.deletedAt)
      )
    );

  // 2. Get all connections between them
  const allConnections = await db
    .select({
      person1: people,
      person2: people2,
      qualifier: connections.qualifier,
      strength: connections.strength,
      since: connections.since,
      comment: connections.comment,
    })
    .from(connections)
    .innerJoin(people, eq(connections.person1Id, people.id))
    .innerJoin(people.as('people2'), eq(connections.person2Id, people2.id))
    .where(
      and(
        eq(people.userId, userId),
        isNull(connections.deletedAt)
      )
    );

  // 3. Calculate relationship strength for each connection
  // (based on shared stories, time known, etc.)
  for (const conn of allConnections) {
    const sharedStories = await db
      .select({ count: sql`count(distinct ${storyPeople.storyId})` })
      .from(storyPeople)
      .innerJoin(storyPeople2, eq(storyPeople.storyId, storyPeople2.storyId))
      .where(
        and(
          eq(storyPeople.personId, conn.person1.id),
          eq(storyPeople2.personId, conn.person2.id)
        )
      );

    conn.sharedStoriesCount = sharedStories[0].count;

    // Calculate strength: weighted average of factors
    conn.computedStrength = calculateStrength({
      sharedStories: conn.sharedStoriesCount,
      timeKnown: Date.now() - conn.since?.getTime(),
      manualStrength: conn.strength,
    });
  }

  return {
    nodes: peopleInNetwork.map(p => ({
      id: p.id,
      name: p.name,
      type: p.relationshipType,
    })),
    edges: allConnections.map(c => ({
      source: c.person1.id,
      target: c.person2.id,
      qualifier: c.qualifier,
      strength: c.computedStrength,
      sharedStories: c.sharedStoriesCount,
    })),
  };
}
```

**Performance:** Multiple queries, 50-100ms for 50 people

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Get all KNOWS relations
SELECT ?person1 ?person2 ?qualifier ?strength ?since
WHERE {
  ?person1 :KNOWS ?person2 .
  OPTIONAL { ?person1 :qualifier ?qualifier } .
  OPTIONAL { ?person1 :strength ?strength } .
  OPTIONAL { ?person1 :since ?since } .
}
```

```typescript
// Or using N3.js for graph traversal
const allKnowsRelations = store.getQuads(null, FRIENDS('KNOWS'), null, null);

const network = {
  nodes: new Set(),
  edges: [],
};

allKnowsRelations.forEach(quad => {
  const person1 = quad.subject.value;
  const person2 = quad.object.value;

  network.nodes.add(person1);
  network.nodes.add(person2);

  // Get metadata (qualifier, strength, etc.)
  const metadata = getMetadataForRelation(quad);

  network.edges.push({
    source: person1,
    target: person2,
    ...metadata,
  });
});

// Calculate relationship strength from shared stories
function calculateStrengthRDF(person1, person2) {
  const person1Stories = store.getQuads(person1, FRIENDS('mentionedIn'), null, null);
  const person2Stories = store.getQuads(person2, FRIENDS('mentionedIn'), null, null);

  // Find intersection
  const sharedStories = person1Stories.filter(s1 =>
    person2Stories.some(s2 => s1.object.equals(s2.object))
  );

  return sharedStories.length / 20; // Normalize to 0-1
}
```

**Performance:** 1 query + in-memory computation, 10-20ms

**Winner for this case:** 🏆 **RDF** (natural graph traversal)

---

### Use Case 3: Preferences Matrix View

**Requirement:** "Who likes what?" - show preferences across multiple people

#### SQLite + Drizzle

```typescript
// Get preferences for multiple people
async function getPreferencesMatrix(peopleIds: string[]) {
  const db = getDatabase();

  // Get all preferences for selected people
  const allPrefs = await db
    .select({
      personId: preferences.personId,
      personName: people.name,
      category: preferences.category,
      item: preferences.item,
      type: preferences.type, // 'likes' or 'dislikes'
      severity: preferences.severity, // for allergies
    })
    .from(preferences)
    .innerJoin(people, eq(preferences.personId, people.id))
    .where(
      and(
        inArray(preferences.personId, peopleIds),
        isNull(preferences.deletedAt)
      )
    )
    .orderBy(preferences.item, people.name);

  // Group by item for matrix view
  const matrix: Record<string, Record<string, PreferenceCell>> = {};

  allPrefs.forEach(pref => {
    if (!matrix[pref.item]) {
      matrix[pref.item] = {};
    }

    matrix[pref.item][pref.personId] = {
      type: pref.type,
      severity: pref.severity,
      category: pref.category,
    };
  });

  return {
    people: [...new Set(allPrefs.map(p => ({ id: p.personId, name: p.personName })))],
    items: Object.keys(matrix),
    matrix,
  };
}

// Query: "Who likes ice cream?"
async function whoLikes(item: string) {
  const db = getDatabase();

  return await db
    .select({
      person: people,
      intensity: preferences.intensity,
      confidence: preferences.confidence,
    })
    .from(people)
    .innerJoin(preferences, eq(people.id, preferences.personId))
    .where(
      and(
        eq(preferences.item, item),
        eq(preferences.type, 'likes'),
        isNull(preferences.deletedAt)
      )
    );
}
```

**Performance:** 1-2 queries, 10-20ms

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Who likes ice cream?
SELECT ?person ?name ?intensity
WHERE {
  ?person :LIKES :preference/ice-cream .
  ?person foaf:name ?name .
  OPTIONAL { ?person :intensity ?intensity } .
}

# Get all preferences for matrix
SELECT ?person ?item ?type ?severity
WHERE {
  ?person ?relation ?prefNode .
  FILTER(?relation IN (:LIKES, :DISLIKES))

  ?prefNode :item ?item .
  OPTIONAL { ?prefNode :severity ?severity } .

  BIND(IF(?relation = :LIKES, "likes", "dislikes") AS ?type)
}
```

```typescript
// N3.js implementation
function getPreferencesMatrix(peopleIds: string[]) {
  const matrix: any = {};

  peopleIds.forEach(personId => {
    const person = FRIENDS(`person/${personId}`);

    // Get LIKES
    const likes = store.getQuads(person, FRIENDS('LIKES'), null, null);
    likes.forEach(quad => {
      const prefNode = quad.object;
      const item = getItemFromPrefNode(prefNode);

      if (!matrix[item]) matrix[item] = {};
      matrix[item][personId] = {
        type: 'likes',
        confidence: getConfidence(prefNode),
      };
    });

    // Get DISLIKES
    const dislikes = store.getQuads(person, FRIENDS('DISLIKES'), null, null);
    dislikes.forEach(quad => {
      const prefNode = quad.object;
      const item = getItemFromPrefNode(prefNode);

      if (!matrix[item]) matrix[item] = {};
      matrix[item][personId] = {
        type: 'dislikes',
        severity: getSeverity(prefNode),
      };
    });
  });

  return matrix;
}
```

**Performance:** 1 SPARQL query or 1 N3 traversal, 5-10ms

**Winner for this case:** 🤝 **Tie** (both equally good)

---

### Use Case 4: Timeline View

**Requirement:** Show chronological events for a person

#### SQLite + Drizzle

```typescript
async function getTimeline(personId: string) {
  const db = getDatabase();

  // Get all timeline events involving this person
  const events = await db
    .select({
      id: timelineEvents.id,
      type: timelineEvents.eventType,
      description: timelineEvents.description,
      date: timelineEvents.eventDate,
      location: timelineEvents.location,
      storyId: timelineEvents.sourceStoryId,
    })
    .from(timelineEvents)
    .innerJoin(eventPeople, eq(timelineEvents.id, eventPeople.eventId))
    .where(
      and(
        eq(eventPeople.personId, personId),
        isNull(timelineEvents.deletedAt)
      )
    )
    .orderBy(desc(timelineEvents.eventDate));

  // Also get important dates
  const importantDates = await db
    .select()
    .from(importantDates)
    .where(eq(importantDates.personId, personId))
    .orderBy(importantDates.date);

  // Merge and sort
  return [...events, ...importantDates].sort((a, b) =>
    b.date.getTime() - a.date.getTime()
  );
}
```

**Performance:** 2 queries, 10-15ms

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Get all events for person, ordered by date
SELECT ?event ?type ?description ?date ?location
WHERE {
  :person/ola :EXPERIENCED ?event .
  ?event :eventType ?type .
  ?event :description ?description .
  ?event :eventDate ?date .
  OPTIONAL { ?event :location ?location } .
}
ORDER BY DESC(?date)
```

**Performance:** 1 query, 5-10ms

**Winner for this case:** 🏆 **RDF** (simpler query)

---

### Use Case 5: Skills & Resources Search

**Requirement:** "Who knows Python?" or "Who has a Tesla?"

#### SQLite + Drizzle

```typescript
// Who knows Python?
async function whoHasSkill(skill: string) {
  const db = getDatabase();

  return await db
    .select({
      person: people,
      level: skills.level,
      yearsExperience: skills.yearsExperience,
      domain: skills.domain,
    })
    .from(people)
    .innerJoin(skills, eq(people.id, skills.personId))
    .where(
      and(
        like(skills.skill, `%${skill}%`),
        isNull(skills.deletedAt)
      )
    )
    .orderBy(desc(skills.level));
}

// Who owns a Tesla?
async function whoOwns(item: string) {
  const db = getDatabase();

  return await db
    .select({
      person: people,
      since: possessions.since,
      category: possessions.category,
    })
    .from(people)
    .innerJoin(possessions, eq(people.id, possessions.personId))
    .where(
      and(
        like(possessions.item, `%${item}%`),
        isNull(possessions.deletedAt)
      )
    );
}
```

**Performance:** 1 query with LIKE, 5-15ms (with index)

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Who has Python skill?
SELECT ?person ?name ?level ?domain
WHERE {
  ?person :HAS_SKILL ?skillNode .
  ?skillNode :skill "Python" .
  ?skillNode :level ?level .
  ?skillNode :domain ?domain .
  ?person foaf:name ?name .
}
ORDER BY DESC(?level)

# Who owns a Tesla?
SELECT ?person ?name ?since
WHERE {
  ?person :OWNS ?possessionNode .
  ?possessionNode :item ?item .
  FILTER(CONTAINS(LCASE(?item), "tesla"))
  ?person foaf:name ?name .
  OPTIONAL { ?possessionNode :since ?since } .
}
```

**Performance:** 1 SPARQL query, 5-10ms

**Winner for this case:** 🤝 **Tie**

---

### Use Case 6: Meal Planning Assistant

**Requirement:** Aggregate dietary restrictions, preferences, generate safe menu

#### SQLite + Drizzle

```typescript
async function analyzeDietaryNeeds(guestIds: string[]) {
  const db = getDatabase();

  // 1. Get all dietary restrictions (DISLIKES with severity)
  const restrictions = await db
    .select({
      personId: preferences.personId,
      personName: people.name,
      item: preferences.item,
      severity: preferences.severity, // extreme for allergies
      reason: preferences.reason,
    })
    .from(preferences)
    .innerJoin(people, eq(preferences.personId, people.id))
    .where(
      and(
        inArray(preferences.personId, guestIds),
        eq(preferences.type, 'dislikes'),
        isNull(preferences.deletedAt)
      )
    );

  // 2. Get popular likes
  const likes = await db
    .select({
      item: preferences.item,
      category: preferences.category,
      count: sql`count(*)`,
      avgIntensity: sql`avg(intensity)`,
    })
    .from(preferences)
    .where(
      and(
        inArray(preferences.personId, guestIds),
        eq(preferences.type, 'likes'),
        isNull(preferences.deletedAt)
      )
    )
    .groupBy(preferences.item, preferences.category)
    .orderBy(desc(sql`count(*)`));

  // 3. Analyze
  const criticalRestrictions = restrictions.filter(r => r.severity === 'extreme');
  const popularLikes = likes.filter(l => l.count >= guestIds.length * 0.6);

  return {
    critical: criticalRestrictions,
    popular: popularLikes,
    insights: generateInsights(criticalRestrictions, popularLikes, guestIds.length),
  };
}

function generateInsights(critical, popular, totalGuests) {
  const insights = [];

  if (critical.length > 0) {
    insights.push({
      type: 'warning',
      message: `⚠️ ${critical.length} severe allergies detected`,
      items: critical,
    });
  }

  popular.forEach(item => {
    const percentage = (item.count / totalGuests) * 100;
    insights.push({
      type: 'recommendation',
      message: `${percentage.toFixed(0)}% of guests like ${item.item}`,
      confidence: item.avgIntensity,
    });
  });

  return insights;
}
```

**Performance:** 2 queries + JS aggregation, 20-30ms

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Get all dietary restrictions for guests
SELECT ?person ?name ?item ?severity ?reason
WHERE {
  VALUES ?person { :person/ola :person/sarah :person/mark }

  ?person :DISLIKES ?prefNode .
  ?prefNode :item ?item .
  ?prefNode :severity ?severity .
  OPTIONAL { ?prefNode :reason ?reason } .
  ?person foaf:name ?name .
}

# Get popular likes
SELECT ?item (COUNT(?person) AS ?count)
WHERE {
  VALUES ?person { :person/ola :person/sarah :person/mark }

  ?person :LIKES ?prefNode .
  ?prefNode :item ?item .
}
GROUP BY ?item
HAVING (COUNT(?person) >= 2)
ORDER BY DESC(?count)
```

**Performance:** 2 SPARQL queries, 10-20ms

**Winner for this case:** 🏆 **RDF** (cleaner aggregation)

---

### Use Case 7: Gift Ideas

**Requirement:** Recommend gifts based on preferences, skills, possessions

#### SQLite + Drizzle

```typescript
async function getGiftIdeas(personId: string) {
  const db = getDatabase();

  // 1. Get top likes
  const topLikes = await db
    .select()
    .from(preferences)
    .where(
      and(
        eq(preferences.personId, personId),
        eq(preferences.type, 'likes'),
        gte(preferences.intensity, 'strong'),
        isNull(preferences.deletedAt)
      )
    )
    .orderBy(desc(preferences.confidence), desc(preferences.intensity));

  // 2. Get skills (potential training/tools)
  const skills = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.personId, personId),
        isNull(skills.deletedAt)
      )
    );

  // 3. Get what they own (avoid duplicates)
  const owns = await db
    .select()
    .from(possessions)
    .where(
      and(
        eq(possessions.personId, personId),
        isNull(possessions.deletedAt)
      )
    );

  // 4. Get dislikes/allergies (avoid)
  const avoid = await db
    .select()
    .from(preferences)
    .where(
      and(
        eq(preferences.personId, personId),
        eq(preferences.type, 'dislikes'),
        isNull(preferences.deletedAt)
      )
    );

  // 5. Generate recommendations
  const recommendations = [];

  topLikes.forEach(like => {
    if (like.category === 'travel') {
      recommendations.push({
        idea: `${like.item} travel guide or photo book`,
        match: 5,
        budget: '$30-50',
        reason: `Loves ${like.item}`,
      });
    } else if (like.category === 'food') {
      recommendations.push({
        idea: `Artisan ${like.item} or cooking class`,
        match: 4,
        budget: '$50-100',
        reason: `Enjoys ${like.item}`,
      });
    }
  });

  skills.forEach(skill => {
    if (skill.level === 'intermediate') {
      recommendations.push({
        idea: `Advanced ${skill.skill} course or equipment`,
        match: 4,
        budget: '$100-300',
        reason: `${skill.level} level in ${skill.skill}`,
      });
    }
  });

  return {
    recommendations: recommendations.sort((a, b) => b.match - a.match),
    avoid: avoid.map(a => a.item),
  };
}
```

**Performance:** 4 queries + JS logic, 30-50ms

#### RDF/Turtle

```sparql
PREFIX : <http://friends.app/ontology#>

# Get all relevant data for gift recommendations
SELECT ?relationType ?object ?metadata
WHERE {
  :person/ola ?relationType ?object .
  FILTER(?relationType IN (:LIKES, :HAS_SKILL, :OWNS, :DISLIKES))

  # Get metadata
  OPTIONAL {
    ?object :intensity ?intensity .
    ?object :confidence ?confidence .
    ?object :level ?level .
  }

  BIND(
    COALESCE(?intensity, ?level, "unknown") AS ?metadata
  )
}
```

Then generate recommendations in JavaScript using pattern matching.

**Performance:** 1 SPARQL query + JS logic, 15-25ms

**Winner for this case:** 🏆 **RDF** (fewer queries)

---

## 🏆 Final Verdict

### Capability Summary

| Feature | SQLite + Drizzle | RDF/Turtle | Winner |
|---------|------------------|------------|--------|
| **Basic CRUD** | ✅ Excellent | ✅ Good | SQLite |
| **Graph Traversal** | ⚠️ Complex (CTEs) | ✅ Natural | RDF |
| **Aggregation** | ✅ Excellent (SQL) | ✅ Good (SPARQL) | Tie |
| **Full-Text Search** | ✅ FTS5 | ⚠️ Manual | SQLite |
| **Type Safety** | ✅ Drizzle types | ⚠️ Manual | SQLite |
| **Learning Curve** | ✅ SQL (familiar) | ⚠️ SPARQL (new) | SQLite |
| **Mobile Support** | ✅ expo-sqlite | ❌ Poor | SQLite |
| **Performance** | ✅ Fast (native) | ✅ Fast (<10k) | Tie |
| **Flexibility** | ⚠️ Schema changes | ✅ Easy to extend | RDF |

---

## 💡 Recommendation

### Phase 1 (MVP): **SQLite + Drizzle** 🏆

**Why:**
1. ✅ **Team familiarity** - Everyone knows SQL
2. ✅ **Better tooling** - Drizzle provides TypeScript types
3. ✅ **Mobile-ready** - expo-sqlite for React Native
4. ✅ **Full-text search** - FTS5 for story content
5. ✅ **Proven** - Battle-tested for 20+ years

**Trade-off:**
- Graph queries are more complex (recursive CTEs)
- But you only have <10k records, so performance is fine

### Phase 2+: **Consider RDF** if:
- You need complex graph traversal (3+ hops)
- You want semantic web integration
- Graph queries become a bottleneck

---

## 🔄 Migration Path

If you start with SQLite and want RDF later:

```typescript
// Export from SQLite to RDF
async function exportToRDF(db) {
  const people = await db.select().from(people);
  const preferences = await db.select().from(preferences);

  let turtle = `@prefix : <http://friends.app/> .\n\n`;

  people.forEach(person => {
    turtle += `:person/${person.id} a :Person ;\n`;
    turtle += `  foaf:name "${person.name}" .\n\n`;
  });

  preferences.forEach(pref => {
    const relType = pref.type === 'likes' ? 'LIKES' : 'DISLIKES';
    turtle += `:person/${pref.personId} :${relType} :pref/${pref.id} .\n`;
    turtle += `:pref/${pref.id} :item "${pref.item}" ;\n`;
    turtle += `  :confidence ${pref.confidence} .\n\n`;
  });

  return turtle;
}
```

**Both directions are possible!**

---

## 🎯 Answer to Your Question

**"Could DB and Terse RDF Triple Language handle all those cases?"**

**Answer:** ✅ **YES, absolutely!**

- **SQLite:** Can handle everything via SQL queries (some complex, but doable)
- **RDF/Turtle:** Can handle everything via SPARQL (some queries are simpler)

**Both are capable.** The choice is:
- **SQLite** = Easier for most developers, better mobile support
- **RDF** = Better for complex graph queries, more flexible schema

**My recommendation:** Start with **SQLite** (easier for Phase 1), keep door open for RDF later if needed.

**You won't regret either choice!** Both work. 🎉
