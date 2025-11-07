# Local-First Architecture for Friends App

**Updated:** November 7, 2025
**Version:** 2.0 - Privacy-First, Local-First Design

---

## 🎯 Architecture Goals

### Core Requirements
1. **Privacy-First:** User data stays on their device
2. **Small Dataset:** <10,000 triples (people, stories, preferences)
3. **Offline-First:** Full functionality without internet
4. **Optional Cloud:** AI proxy server only (no user data storage)
5. **Cross-Platform:** Desktop (Electron/Tauri) + Mobile (Expo)

### Why Local-First?

```
Traditional Web App:              Local-First App:
┌──────────┐                     ┌──────────┐
│  Browser │◄────────────────────┤  Browser │
└──────────┘                     │  + DB    │
     │                           └──────────┘
     ▼                                 │
┌──────────┐                           │ (optional)
│  Server  │                           ▼
│  + DB    │                     ┌──────────┐
└──────────┘                     │AI Proxy  │
                                 │(no data) │
                                 └──────────┘

❌ Privacy concerns              ✅ Data stays local
❌ Server costs                  ✅ No hosting costs
❌ Requires internet             ✅ Works offline
❌ Slower (network latency)      ✅ Instant queries
```

---

## 🏗️ Architecture Options

## Option 1: RDF/Turtle (Local Files) ⭐ **RECOMMENDED for <10k triples**

### Why RDF/Turtle Wins at This Scale

With **<10,000 triples**, RDF/Turtle becomes the ideal choice:

✅ **Performance is NOT an issue** - In-memory is fast enough
✅ **Human-readable** - Can manually edit .ttl files
✅ **Git-friendly** - Version control for your social graph!
✅ **Semantic richness** - Express complex relationships naturally
✅ **Portable** - Single file per graph, easy backup
✅ **Privacy-first** - Plain text files on user's device
✅ **No database setup** - Just read/write files
✅ **Export/Import** - Share graphs with friends trivially

### File Structure

```
~/Documents/Friends/           # User's data directory
├── config.json               # App settings
├── graphs/
│   ├── main.ttl             # Primary knowledge graph (<10k triples)
│   ├── people.ttl           # Optional: separate people graph
│   └── stories.ttl          # Optional: separate stories
├── attachments/
│   ├── photos/
│   │   ├── ola-profile.jpg
│   │   └── italy-trip.jpg
│   └── audio/
└── backups/
    ├── 2025-11-07-main.ttl
    └── 2025-11-06-main.ttl
```

### Complete RDF Ontology

```turtle
@prefix : <http://friends.app/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix schema: <http://schema.org/> .

# ========================================
# ONTOLOGY DEFINITIONS
# ========================================

## Classes
:Person a rdfs:Class ;
    rdfs:label "Person" ;
    rdfs:comment "A person in the user's social network" .

:Story a rdfs:Class ;
    rdfs:label "Story" ;
    rdfs:comment "A narrative memory about experiences" .

:Preference a rdfs:Class ;
    rdfs:label "Preference" ;
    rdfs:comment "Something a person likes or dislikes" .

:SharedExperience a rdfs:Class ;
    rdfs:label "Shared Experience" ;
    rdfs:comment "An event or activity shared by multiple people" .

:TimelineEvent a rdfs:Class ;
    rdfs:label "Timeline Event" ;
    rdfs:comment "A point-in-time event in a relationship" .

## Properties
:knows a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range :Person ;
    rdfs:label "knows" .

:likes a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range :Preference ;
    rdfs:label "likes" .

:dislikes a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range :Preference ;
    rdfs:label "dislikes" .

:experiencedWith a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range :SharedExperience ;
    rdfs:label "experienced with" .

:mentionedIn a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range :Story ;
    rdfs:label "mentioned in" .

:relationshipStrength a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range xsd:decimal ;
    rdfs:label "relationship strength" ;
    rdfs:comment "0.0 to 1.0 indicating closeness" .

:confidence a rdf:Property ;
    rdfs:domain :Preference ;
    rdfs:range xsd:decimal ;
    rdfs:label "confidence" ;
    rdfs:comment "AI confidence score 0.0 to 1.0" .

:metDate a rdf:Property ;
    rdfs:domain :Person ;
    rdfs:range xsd:date ;
    rdfs:label "met date" .

# ========================================
# EXAMPLE DATA
# ========================================

## People
:person/ola a :Person ;
    foaf:name "Ola" ;
    :metDate "2015-11-07"^^xsd:date ;
    :relationshipType "friend" ;
    foaf:img <file:///attachments/photos/ola-profile.jpg> ;
    schema:birthDate "1990-05-15"^^xsd:date .

:person/user a :Person ;
    foaf:name "Me" ;
    :relationshipType "self" .

## Relationships
:person/ola :knows :person/user ;
    :relationshipStrength "0.85"^^xsd:decimal ;
    :sharedExperiencesCount "12"^^xsd:integer .

## Preferences
:preference/ice-cream a :Preference ;
    :category "food" ;
    :item "ice cream" ;
    :confidence "0.95"^^xsd:decimal ;
    schema:description "Loves ice cream, mentioned multiple times" .

:person/ola :likes :preference/ice-cream .

:preference/italy a :Preference ;
    :category "travel" ;
    :item "Italy" ;
    :confidence "1.0"^^xsd:decimal .

:person/ola :likes :preference/italy .

## Shared Experiences
:experience/italy-trip-2020 a :SharedExperience ;
    schema:name "Italy Trip 2020" ;
    schema:startDate "2020-06-15"^^xsd:date ;
    schema:endDate "2020-06-29"^^xsd:date ;
    schema:location "Italy" ;
    :participants ( :person/ola :person/user ) ;
    :activityType "travel" ;
    schema:image <file:///attachments/photos/italy-trip.jpg> .

:person/ola :experiencedWith :experience/italy-trip-2020 .
:person/user :experiencedWith :experience/italy-trip-2020 .

## Stories
:story/first-meeting a :Story ;
    schema:dateCreated "2025-11-07T10:30:00Z"^^xsd:dateTime ;
    schema:text """I met Ola 10 years ago at a conference in Warsaw.
    We immediately bonded over our love for travel and good food.""" ;
    :extractedAt "2025-11-07T10:31:00Z"^^xsd:dateTime ;
    :aiModel "gpt-4" .

:person/ola :mentionedIn :story/first-meeting .

:story/italy-adventures a :Story ;
    schema:dateCreated "2025-11-07T11:00:00Z"^^xsd:dateTime ;
    schema:text """We have been to Italy together many times.
    We always eat ice cream - it's become our tradition!""" ;
    :extractedAt "2025-11-07T11:01:00Z"^^xsd:dateTime ;
    :aiModel "gpt-4" .

:person/ola :mentionedIn :story/italy-adventures .
:person/user :mentionedIn :story/italy-adventures .

## Timeline Events
:event/first-met a :TimelineEvent ;
    :eventType "first_met" ;
    schema:startDate "2015-11-07"^^xsd:date ;
    schema:location "Warsaw, Poland" ;
    :participants ( :person/ola :person/user ) ;
    :derivedFrom :story/first-meeting .

:event/italy-trip-1 a :TimelineEvent ;
    :eventType "shared_experience" ;
    schema:startDate "2016-07-10"^^xsd:date ;
    schema:location "Rome, Italy" ;
    :participants ( :person/ola :person/user ) .

:event/italy-trip-2 a :TimelineEvent ;
    :eventType "shared_experience" ;
    schema:startDate "2017-08-15"^^xsd:date ;
    schema:location "Florence, Italy" ;
    :participants ( :person/ola :person/user ) .

# ... more trips ...

## Inferred Knowledge (computed by reasoner)
:person/ola :hasInterest :category/travel .
:person/ola :hasInterest :category/food .

:person/user :couldIntroduce ( :person/ola :person/mark ) ;
    :commonInterests ( "travel" "food" "hiking" ) .
```

### TypeScript Implementation

```typescript
import { Store, DataFactory, Parser, Writer } from 'n3';
import * as fs from 'fs/promises';
import * as path from 'path';

const { namedNode, literal, quad } = DataFactory;

// Namespace helpers
const FRIENDS = (term: string) => namedNode(`http://friends.app/ontology#${term}`);
const FOAF = (term: string) => namedNode(`http://xmlns.com/foaf/0.1/${term}`);
const SCHEMA = (term: string) => namedNode(`http://schema.org/${term}`);
const XSD = (term: string) => namedNode(`http://www.w3.org/2001/XMLSchema#${term}`);

class FriendsGraph {
  private store: Store;
  private dataDir: string;
  private mainGraphPath: string;

  constructor(dataDir: string = '~/Documents/Friends') {
    this.dataDir = path.resolve(dataDir);
    this.mainGraphPath = path.join(this.dataDir, 'graphs', 'main.ttl');
    this.store = new Store();
  }

  // Initialize and load graph
  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.mainGraphPath), { recursive: true });

    if (await this.fileExists(this.mainGraphPath)) {
      await this.loadGraph();
    } else {
      await this.initializeOntology();
    }
  }

  // Load graph from Turtle file
  async loadGraph(): Promise<void> {
    const turtleData = await fs.readFile(this.mainGraphPath, 'utf-8');
    const parser = new Parser();
    const quads = parser.parse(turtleData);
    this.store.addQuads(quads);
    console.log(`Loaded ${quads.length} triples from ${this.mainGraphPath}`);
  }

  // Save graph to Turtle file
  async saveGraph(): Promise<void> {
    const writer = new Writer({ prefixes: {
      '': 'http://friends.app/ontology#',
      foaf: 'http://xmlns.com/foaf/0.1/',
      schema: 'http://schema.org/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    }});

    writer.addQuads(this.store.getQuads(null, null, null, null));

    const turtle = await new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    await fs.writeFile(this.mainGraphPath, turtle, 'utf-8');
    console.log(`Saved ${this.store.size} triples to ${this.mainGraphPath}`);
  }

  // Add a person
  addPerson(id: string, name: string, metDate?: Date, relationship?: string): void {
    const personNode = FRIENDS(`person/${id}`);

    this.store.addQuad(
      personNode,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      FRIENDS('Person')
    );

    this.store.addQuad(
      personNode,
      FOAF('name'),
      literal(name)
    );

    if (metDate) {
      this.store.addQuad(
        personNode,
        FRIENDS('metDate'),
        literal(metDate.toISOString().split('T')[0], XSD('date'))
      );
    }

    if (relationship) {
      this.store.addQuad(
        personNode,
        FRIENDS('relationshipType'),
        literal(relationship)
      );
    }
  }

  // Add a preference
  addPreference(
    personId: string,
    category: string,
    item: string,
    type: 'likes' | 'dislikes',
    confidence: number
  ): void {
    const personNode = FRIENDS(`person/${personId}`);
    const prefId = `${category}-${item.replace(/\s+/g, '-').toLowerCase()}`;
    const prefNode = FRIENDS(`preference/${prefId}`);

    // Create preference node
    this.store.addQuad(prefNode, FRIENDS('category'), literal(category));
    this.store.addQuad(prefNode, FRIENDS('item'), literal(item));
    this.store.addQuad(
      prefNode,
      FRIENDS('confidence'),
      literal(confidence.toString(), XSD('decimal'))
    );

    // Link person to preference
    const predicate = type === 'likes' ? FRIENDS('likes') : FRIENDS('dislikes');
    this.store.addQuad(personNode, predicate, prefNode);
  }

  // Add a story
  addStory(id: string, content: string, peopleIds: string[]): void {
    const storyNode = FRIENDS(`story/${id}`);

    this.store.addQuad(
      storyNode,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      FRIENDS('Story')
    );

    this.store.addQuad(
      storyNode,
      SCHEMA('text'),
      literal(content)
    );

    this.store.addQuad(
      storyNode,
      SCHEMA('dateCreated'),
      literal(new Date().toISOString(), XSD('dateTime'))
    );

    // Link people to story
    peopleIds.forEach(personId => {
      this.store.addQuad(
        FRIENDS(`person/${personId}`),
        FRIENDS('mentionedIn'),
        storyNode
      );
    });
  }

  // Query: Get all people
  getPeople(): Array<{ id: string; name: string; metDate?: string }> {
    const people: Array<{ id: string; name: string; metDate?: string }> = [];

    const personQuads = this.store.getQuads(
      null,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      FRIENDS('Person'),
      null
    );

    personQuads.forEach(quad => {
      const personNode = quad.subject;
      const id = personNode.value.split('/').pop() || '';

      const nameQuad = this.store.getQuads(personNode, FOAF('name'), null, null)[0];
      const name = nameQuad ? nameQuad.object.value : '';

      const metDateQuad = this.store.getQuads(personNode, FRIENDS('metDate'), null, null)[0];
      const metDate = metDateQuad ? metDateQuad.object.value : undefined;

      people.push({ id, name, metDate });
    });

    return people;
  }

  // Query: Get person's preferences
  getPreferences(personId: string): Array<{ category: string; item: string; type: string; confidence: number }> {
    const personNode = FRIENDS(`person/${personId}`);
    const preferences: Array<{ category: string; item: string; type: string; confidence: number }> = [];

    ['likes', 'dislikes'].forEach(type => {
      const prefQuads = this.store.getQuads(personNode, FRIENDS(type), null, null);

      prefQuads.forEach(quad => {
        const prefNode = quad.object;

        const categoryQuad = this.store.getQuads(prefNode, FRIENDS('category'), null, null)[0];
        const itemQuad = this.store.getQuads(prefNode, FRIENDS('item'), null, null)[0];
        const confQuad = this.store.getQuads(prefNode, FRIENDS('confidence'), null, null)[0];

        if (categoryQuad && itemQuad && confQuad) {
          preferences.push({
            category: categoryQuad.object.value,
            item: itemQuad.object.value,
            type,
            confidence: parseFloat(confQuad.object.value),
          });
        }
      });
    });

    return preferences;
  }

  // Query: Get people who like a specific item
  getPeopleWhoLike(item: string): string[] {
    const people: string[] = [];

    // Find all preference nodes with this item
    const prefNodes = this.store.getQuads(null, FRIENDS('item'), literal(item), null)
      .map(q => q.subject);

    // Find people who like these preferences
    prefNodes.forEach(prefNode => {
      const personQuads = this.store.getQuads(null, FRIENDS('likes'), prefNode, null);
      personQuads.forEach(quad => {
        const personId = quad.subject.value.split('/').pop() || '';
        const nameQuad = this.store.getQuads(quad.subject, FOAF('name'), null, null)[0];
        if (nameQuad) {
          people.push(nameQuad.object.value);
        }
      });
    });

    return people;
  }

  // Query: Get shared experiences between two people
  getSharedExperiences(personId1: string, personId2: string): any[] {
    const person1 = FRIENDS(`person/${personId1}`);
    const person2 = FRIENDS(`person/${personId2}`);

    const experiences: any[] = [];

    const person1Stories = this.store.getQuads(person1, FRIENDS('mentionedIn'), null, null)
      .map(q => q.object);
    const person2Stories = this.store.getQuads(person2, FRIENDS('mentionedIn'), null, null)
      .map(q => q.object);

    // Find common stories
    const sharedStories = person1Stories.filter(s1 =>
      person2Stories.some(s2 => s1.equals(s2))
    );

    sharedStories.forEach(storyNode => {
      const textQuad = this.store.getQuads(storyNode, SCHEMA('text'), null, null)[0];
      const dateQuad = this.store.getQuads(storyNode, SCHEMA('dateCreated'), null, null)[0];

      if (textQuad) {
        experiences.push({
          text: textQuad.object.value,
          date: dateQuad ? dateQuad.object.value : null,
        });
      }
    });

    return experiences;
  }

  // Backup graph
  async backup(): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = path.join(this.dataDir, 'backups', `${timestamp}-main.ttl`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(this.mainGraphPath, backupPath);
    console.log(`Backed up to ${backupPath}`);
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async initializeOntology(): Promise<void> {
    // Add base ontology definitions
    this.store.addQuad(
      FRIENDS('Person'),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/2000/01/rdf-schema#Class')
    );
    // ... more ontology setup
    await this.saveGraph();
  }
}

// Usage example
async function main() {
  const graph = new FriendsGraph();
  await graph.initialize();

  // Add data
  graph.addPerson('ola', 'Ola', new Date('2015-11-07'), 'friend');
  graph.addPreference('ola', 'food', 'ice cream', 'likes', 0.95);
  graph.addStory('story1', 'I met Ola 10 years ago...', ['ola']);

  // Query
  const people = graph.getPeople();
  console.log('People:', people);

  const preferences = graph.getPreferences('ola');
  console.log('Ola\'s preferences:', preferences);

  const iceLovers = graph.getPeopleWhoLike('ice cream');
  console.log('Who likes ice cream:', iceLovers);

  // Save
  await graph.saveGraph();
  await graph.backup();
}
```

### Performance Analysis

```typescript
// Performance test with 10k triples
import { performance } from 'perf_hooks';

async function benchmarkRDFPerformance() {
  const graph = new FriendsGraph();
  await graph.initialize();

  // Add 100 people (typical for personal network)
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    graph.addPerson(`person${i}`, `Person ${i}`, new Date(), 'friend');

    // Each person has 5 preferences (500 preference triples)
    for (let j = 0; j < 5; j++) {
      graph.addPreference(`person${i}`, 'food', `item${j}`, 'likes', 0.9);
    }

    // Each person in 3 stories (300 story triples)
    for (let k = 0; k < 3; k++) {
      graph.addStory(`story${i}-${k}`, `Story content...`, [`person${i}`]);
    }
  }

  const addTime = performance.now() - start;
  console.log(`Added 100 people with preferences and stories in ${addTime.toFixed(2)}ms`);
  console.log(`Total triples: ${graph.store.size}`);

  // Query performance
  const queryStart = performance.now();
  const allPeople = graph.getPeople();
  const prefs = graph.getPreferences('person0');
  const iceLovers = graph.getPeopleWhoLike('item0');
  const queryTime = performance.now() - queryStart;

  console.log(`Queries completed in ${queryTime.toFixed(2)}ms`);

  // Save performance
  const saveStart = performance.now();
  await graph.saveGraph();
  const saveTime = performance.now() - saveStart;

  console.log(`Saved to file in ${saveTime.toFixed(2)}ms`);
}

// Expected results on modern laptop:
// Added 100 people: ~50-100ms
// Total triples: ~2,000-5,000
// Queries: ~5-10ms
// Save to file: ~20-50ms
//
// Conclusion: Fast enough for <10k triples!
```

---

## Option 2: SQLite (Local Database)

### When to Choose SQLite

Use SQLite if:
- ❌ RDF feels too academic/complex
- ✅ Team prefers SQL
- ✅ Need traditional database features (indexes, transactions)
- ✅ Want ORM support (Prisma, Drizzle)

### Implementation

```typescript
import Database from 'better-sqlite3';

const db = new Database('~/Documents/Friends/friends.db');

// Same schema as PostgreSQL option in TASKS.md
db.exec(`
  CREATE TABLE IF NOT EXISTS people (...);
  CREATE TABLE IF NOT EXISTS stories (...);
  CREATE TABLE IF NOT EXISTS preferences (...);
  -- etc.
`);

// Fast local queries
const people = db.prepare('SELECT * FROM people').all();
const preferences = db.prepare('SELECT * FROM preferences WHERE person_id = ?').all('ola-id');
```

**Performance:** Slightly faster than RDF for simple queries, but similar for your use case.

---

## 🔐 Optional AI Proxy Server

### Architecture

```
┌──────────────────┐
│  Desktop/Mobile  │
│      App         │
│  (User Data)     │
└────────┬─────────┘
         │
         │ HTTPS (story text only)
         ▼
┌──────────────────┐
│   AI Proxy       │
│   Server         │
│  (No storage)    │
└────────┬─────────┘
         │
         │ API calls
         ▼
┌──────────────────┐
│  OpenAI / Claude │
│      API         │
└──────────────────┘
```

### Why an AI Proxy?

1. **Protect API Keys** - Don't expose OpenAI key in client
2. **Cost Control** - Rate limiting, usage tracking
3. **Privacy** - Can add anonymization layer
4. **Fallback** - Switch between models (GPT-4 → Claude → local)

### Minimal Proxy Implementation

```typescript
// server/proxy.ts
import express from 'express';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rate limiting: 10 requests per minute per user
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later',
});

app.use(express.json());
app.use(limiter);

// Single endpoint: extract entities from story
app.post('/api/extract', async (req, res) => {
  try {
    const { story } = req.body;

    if (!story || story.length > 10000) {
      return res.status(400).json({ error: 'Invalid story length' });
    }

    // Call OpenAI (user's story data is NOT stored)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an AI that extracts structured data from personal stories.
          Extract: people, preferences (likes/dislikes), timeline events, locations, tags.
          Return JSON with confidence scores.`,
        },
        {
          role: 'user',
          content: story,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(completion.choices[0].message.content || '{}');

    // Return immediately (no storage!)
    res.json({
      extracted,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

app.listen(3000, () => {
  console.log('AI Proxy running on http://localhost:3000');
});
```

### Deploy Options

1. **Cloudflare Workers** - Free tier, edge computing
2. **Railway** - Easy deployment, $5/month
3. **Fly.io** - Free tier available
4. **Self-hosted** - VPS ($5/month)

### Client Usage

```typescript
// In your Electron/React Native app
async function extractFromStory(story: string) {
  try {
    const response = await fetch('https://your-proxy.com/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story }),
    });

    const { extracted } = await response.json();

    // Now save extracted data to local RDF/SQLite
    graph.addPreference(extracted.person, extracted.preference, ...);

    return extracted;
  } catch (error) {
    console.error('AI extraction failed, falling back to manual', error);
    return null;
  }
}
```

---

## 🚀 Recommended Stack

### Phase 1: Local-First MVP

```
Frontend:
  - Electron (Desktop): React + TypeScript + Tailwind
  - OR Tauri (Rust): Lighter, faster alternative

Data Layer:
  - RDF/Turtle with N3.js (recommended for <10k triples)
  - OR SQLite with better-sqlite3

AI:
  - Optional proxy server (deploy later)
  - OR local models (Ollama + Llama 3)

Sync:
  - Git for version control (optional)
  - Dropbox/iCloud file sync (optional)
```

### Phase 2: Add Mobile

```
Mobile:
  - Expo React Native + expo-sqlite
  - OR React Native with RDF library

Sync:
  - End-to-end encrypted sync
  - Conflict resolution via CRDTs or OT
```

---

## 📊 Final Recommendation

### Use RDF/Turtle If:
✅ You want **semantic richness**
✅ You value **human-readable data**
✅ You like **Git-based version control**
✅ Dataset is **<10k triples** ✅ (Your case!)
✅ **Privacy is critical** ✅ (Your case!)

### Use SQLite If:
✅ Team strongly prefers **SQL**
✅ Want **ORM** (Prisma, Drizzle)
✅ Need **complex queries** with indexes
✅ Want traditional **database tooling**

---

## 🎯 My Verdict for Friends App

**RDF/Turtle + Optional AI Proxy** 🏆

**Why:**
1. **<10k triples:** Performance is not an issue
2. **Privacy-first:** Data stays local in human-readable files
3. **Semantic richness:** Natural way to model relationships
4. **Git-friendly:** Version control your social graph!
5. **Portable:** Easy backup, import/export
6. **No server needed:** Except optional AI proxy

**Architecture:**
```
Desktop/Mobile App
├── RDF Store (N3.js / Oxigraph)
├── Local Turtle Files (~1-5MB)
└── Optional: AI Proxy for entity extraction

Later: Add mobile with file sync
```

**Timeline:**
- Week 1-2: Desktop app with local RDF
- Week 3-4: AI integration (proxy or local)
- Week 5-6: Polish + backup system
- Later: Mobile app with sync

---

**Start simple. Build fast. Privacy first. 🔒**
