# Mobile Data Layer Architecture

**Updated:** November 7, 2025
**Focus:** Optimal data storage for iOS & Android

---

## 📚 RDF vs RDFS vs RDFs - Terminology Clarification

### RDF (Resource Description Framework)
- **What it is:** The W3C standard for representing graph data as triples
- **Format:** Subject-Predicate-Object statements
- **Example:** `<Ola> <likes> <IceCream>`

### RDFS (RDF Schema)
- **What it is:** A vocabulary/ontology language for RDF
- **Purpose:** Define classes and properties in RDF
- **Example:** Defining what a "Person" class means
- **Also written as:** RDF-S or "RDF Schema"

### Turtle (TTL)
- **What it is:** A syntax for writing RDF (Terse RDF Triple Language)
- **Purpose:** Human-readable serialization of RDF
- **File extension:** `.ttl`

### Summary
```
RDF = The standard/model (abstract)
  ↓
RDFS = Vocabulary to describe RDF schemas
  ↓
Turtle = Concrete syntax to write RDF in files

You use: RDF (the model) + Turtle (the format)
```

---

## 📱 Mobile Devices: Special Considerations

### Why Mobile is Different

| Factor | Desktop | Mobile |
|--------|---------|--------|
| **CPU Power** | High | Limited |
| **Memory** | 8-32GB RAM | 2-8GB RAM |
| **Storage** | 256GB-2TB SSD | 64-256GB |
| **Battery** | Plugged in | Battery-critical |
| **Network** | WiFi/Ethernet | Cellular/unstable |
| **Screen Size** | Large | Small |

### Impact on Data Layer Choice

1. **In-memory RDF stores** → High memory usage → Battery drain
2. **Complex SPARQL queries** → CPU intensive → Battery drain
3. **Large text files (Turtle)** → Slow parsing on mobile CPU
4. **Network sync** → Must handle offline gracefully

---

## 🏆 Best Options for Mobile

## Option 1: SQLite (Expo SQLite) ⭐ **RECOMMENDED FOR MOBILE**

### Why SQLite Wins on Mobile

✅ **Native to iOS/Android** - Built into the OS
✅ **Blazing fast** - Optimized C code, minimal overhead
✅ **Low memory** - Doesn't load entire dataset into RAM
✅ **Battery efficient** - Minimal CPU usage
✅ **Mature library** - expo-sqlite is battle-tested
✅ **Offline-first** - Perfect for unstable connections
✅ **Small footprint** - ~1-2MB library size
✅ **Indexed queries** - Fast lookups even with 10k+ rows

### Implementation: Expo SQLite

```typescript
// Install
// npx expo install expo-sqlite

import * as SQLite from 'expo-sqlite';

// Open database
const db = SQLite.openDatabase('friends.db');

// Initialize schema
db.transaction(tx => {
  // People table
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      relationship_type TEXT,
      met_date DATE,
      photo_uri TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Preferences table
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS preferences (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      category TEXT,
      item TEXT,
      type TEXT CHECK(type IN ('likes', 'dislikes')),
      confidence REAL,
      source_story_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `);

  // Stories table
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      date DATE,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Story-People junction
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS story_people (
      story_id TEXT,
      person_id TEXT,
      PRIMARY KEY (story_id, person_id),
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `);

  // Connections/relationships
  tx.executeSql(`
    CREATE TABLE IF NOT EXISTS connections (
      person_1_id TEXT,
      person_2_id TEXT,
      strength REAL,
      shared_experiences_count INTEGER DEFAULT 0,
      PRIMARY KEY (person_1_id, person_2_id),
      FOREIGN KEY(person_1_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY(person_2_id) REFERENCES people(id) ON DELETE CASCADE,
      CHECK (person_1_id < person_2_id)
    );
  `);

  // Indexes for performance
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_preferences_person ON preferences(person_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_preferences_item ON preferences(item);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_stories_date ON stories(date);');
});

// Type-safe wrapper class
class FriendsDatabase {
  private db: SQLite.WebSQLDatabase;

  constructor() {
    this.db = SQLite.openDatabase('friends.db');
    this.initialize();
  }

  private initialize() {
    // Schema initialization (shown above)
  }

  // Add person
  async addPerson(person: {
    id: string;
    name: string;
    relationshipType?: string;
    metDate?: Date;
    photoUri?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO people (id, name, relationship_type, met_date, photo_uri)
           VALUES (?, ?, ?, ?, ?)`,
          [
            person.id,
            person.name,
            person.relationshipType || null,
            person.metDate?.toISOString().split('T')[0] || null,
            person.photoUri || null,
          ],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get all people
  async getPeople(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM people ORDER BY name',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get person by ID
  async getPerson(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM people WHERE id = ?',
          [id],
          (_, { rows }) => resolve(rows._array[0]),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Add preference
  async addPreference(pref: {
    id: string;
    personId: string;
    category: string;
    item: string;
    type: 'likes' | 'dislikes';
    confidence: number;
    sourceStoryId?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO preferences (id, person_id, category, item, type, confidence, source_story_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pref.id,
            pref.personId,
            pref.category,
            pref.item,
            pref.type,
            pref.confidence,
            pref.sourceStoryId || null,
          ],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get preferences for person
  async getPreferences(personId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM preferences WHERE person_id = ? ORDER BY category, item',
          [personId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Find people who like something
  async getPeopleWhoLike(item: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT p.* FROM people p
           INNER JOIN preferences pref ON p.id = pref.person_id
           WHERE pref.item = ? AND pref.type = 'likes'
           ORDER BY p.name`,
          [item],
          (_, { rows }) => resolve(rows._array),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Add story
  async addStory(story: {
    id: string;
    content: string;
    date?: Date;
    location?: string;
    peopleIds: string[];
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          // Insert story
          tx.executeSql(
            'INSERT INTO stories (id, content, date, location) VALUES (?, ?, ?, ?)',
            [
              story.id,
              story.content,
              story.date?.toISOString().split('T')[0] || null,
              story.location || null,
            ]
          );

          // Link people
          story.peopleIds.forEach(personId => {
            tx.executeSql(
              'INSERT INTO story_people (story_id, person_id) VALUES (?, ?)',
              [story.id, personId]
            );
          });
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  // Get shared stories between two people
  async getSharedStories(person1Id: string, person2Id: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT DISTINCT s.* FROM stories s
           INNER JOIN story_people sp1 ON s.id = sp1.story_id
           INNER JOIN story_people sp2 ON s.id = sp2.story_id
           WHERE sp1.person_id = ? AND sp2.person_id = ?
           ORDER BY s.date DESC`,
          [person1Id, person2Id],
          (_, { rows }) => resolve(rows._array),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Calculate relationship strength
  async calculateRelationshipStrength(person1Id: string, person2Id: string): Promise<number> {
    const sharedStories = await this.getSharedStories(person1Id, person2Id);
    const storyCount = sharedStories.length;

    // Simple formula: more stories = stronger relationship
    // Cap at 1.0 for 20+ stories
    return Math.min(storyCount / 20, 1.0);
  }

  // Search people by name
  async searchPeople(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM people WHERE name LIKE ? ORDER BY name',
          [`%${query}%`],
          (_, { rows }) => resolve(rows._array),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Export to JSON (for backup or desktop sync)
  async exportToJSON(): Promise<string> {
    const people = await this.getPeople();
    const stories = await new Promise<any[]>((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('SELECT * FROM stories', [], (_, { rows }) => resolve(rows._array));
      });
    });
    const preferences = await new Promise<any[]>((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('SELECT * FROM preferences', [], (_, { rows }) => resolve(rows._array));
      });
    });

    return JSON.stringify({ people, stories, preferences }, null, 2);
  }

  // Import from JSON
  async importFromJSON(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    // Clear existing data
    await new Promise<void>((resolve, reject) => {
      this.db.transaction(
        tx => {
          tx.executeSql('DELETE FROM preferences');
          tx.executeSql('DELETE FROM story_people');
          tx.executeSql('DELETE FROM stories');
          tx.executeSql('DELETE FROM connections');
          tx.executeSql('DELETE FROM people');
        },
        error => reject(error),
        () => resolve()
      );
    });

    // Insert imported data
    for (const person of data.people) {
      await this.addPerson(person);
    }
    // ... import stories, preferences, etc.
  }
}

// Usage in React Native component
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button } from 'react-native';

export default function PeopleScreen() {
  const [db] = useState(() => new FriendsDatabase());
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    const data = await db.getPeople();
    setPeople(data);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await db.searchPeople(query);
      setPeople(results);
    } else {
      loadPeople();
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        placeholder="Search people..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={{ padding: 10, borderWidth: 1, marginBottom: 10 }}
      />
      <FlatList
        data={people}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
            <Text>{item.relationship_type}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

### Performance: SQLite on Mobile

```typescript
// Benchmark on iPhone 13 / Pixel 6
async function benchmarkSQLite() {
  const db = new FriendsDatabase();
  const start = performance.now();

  // Insert 100 people
  for (let i = 0; i < 100; i++) {
    await db.addPerson({
      id: `person-${i}`,
      name: `Person ${i}`,
      relationshipType: 'friend',
    });

    // 5 preferences each
    for (let j = 0; j < 5; j++) {
      await db.addPreference({
        id: `pref-${i}-${j}`,
        personId: `person-${i}`,
        category: 'food',
        item: `item-${j}`,
        type: 'likes',
        confidence: 0.9,
      });
    }
  }

  const insertTime = performance.now() - start;
  console.log(`Inserted 100 people + 500 prefs in ${insertTime.toFixed(2)}ms`);

  // Query performance
  const queryStart = performance.now();
  const allPeople = await db.getPeople();
  const prefs = await db.getPreferences('person-0');
  const iceLovers = await db.getPeopleWhoLike('item-0');
  const queryTime = performance.now() - queryStart;

  console.log(`Queries completed in ${queryTime.toFixed(2)}ms`);
}

// Expected results:
// iPhone 13: ~100-200ms insert, ~5-10ms queries
// Pixel 6: ~150-300ms insert, ~10-20ms queries
//
// Conclusion: Fast enough for real-time UI updates!
```

---

## Option 2: WatermelonDB ⭐ **For Complex Apps**

### What is WatermelonDB?

- **Built for:** React Native apps with complex data
- **Performance:** Optimized for 10,000+ records
- **Features:** Observables (auto-refresh UI), lazy loading
- **Backend:** SQLite with a reactive layer

### When to Use WatermelonDB

✅ You need automatic UI updates when data changes
✅ You have complex relationships and queries
✅ You want observables (like RxJS)
✅ Team is comfortable with ORMs

### Implementation

```typescript
// Install
// npm install @nozbe/watermelondb

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Person from './models/Person';
import Story from './models/Story';
import Preference from './models/Preference';

// Schema definition
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'people',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'relationship_type', type: 'string', isOptional: true },
        { name: 'met_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'preferences',
      columns: [
        { name: 'person_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' },
        { name: 'item', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'confidence', type: 'number' },
      ],
    }),
    // ... more tables
  ],
});

// Initialize database
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'friends',
});

export const database = new Database({
  adapter,
  modelClasses: [Person, Story, Preference],
});

// Model definition
import { Model } from '@nozbe/watermelondb';
import { field, relation, children } from '@nozbe/watermelondb/decorators';

class Person extends Model {
  static table = 'people';

  @field('name') name!: string;
  @field('relationship_type') relationshipType?: string;
  @field('met_date') metDate?: number;

  @children('preferences') preferences!: Query<Preference>;
}

// Usage in component with auto-updates
import { withObservables } from '@nozbe/watermelondb/react';

function PersonDetailComponent({ person, preferences }) {
  return (
    <View>
      <Text>{person.name}</Text>
      {preferences.map(pref => (
        <Text key={pref.id}>{pref.item}</Text>
      ))}
    </View>
  );
}

// Automatically re-render when data changes!
export default withObservables(['personId'], ({ personId, database }) => ({
  person: database.get('people').findAndObserve(personId),
  preferences: database.get('people').findAndObserve(personId).then(p => p.preferences),
}))(PersonDetailComponent);
```

**Pros:**
✅ Reactive UI (auto-updates)
✅ Optimized for 10k+ records
✅ Lazy loading
✅ Sync support built-in

**Cons:**
❌ Learning curve
❌ Larger bundle size
❌ More complex than raw SQLite

---

## Option 3: RDF on Mobile (NOT Recommended)

### JavaScript RDF Libraries for React Native

1. **rdflib.js** - Large bundle (~500KB), slow on mobile
2. **N3.js** - Better, but still ~100KB + in-memory parsing overhead
3. **Oxigraph WASM** - Not available for React Native (no WASM support)

### Why RDF is Problematic on Mobile

❌ **High memory usage** - Entire graph loaded into RAM
❌ **Parsing overhead** - Turtle parsing is CPU-intensive
❌ **Battery drain** - Complex SPARQL queries = battery killer
❌ **Large bundle** - rdflib.js adds 500KB to your app
❌ **No native optimization** - JavaScript-based, can't use native SQLite

### Performance Comparison

```
SQLite (Native):           ~5-10ms for queries
WatermelonDB (SQLite):     ~10-20ms for queries
RDF (rdflib.js):           ~50-200ms for SPARQL queries
RDF (N3.js):               ~30-100ms for queries

Memory:
SQLite:        ~5-10MB for 10k records
RDF in-memory: ~50-100MB for 10k triples
```

---

## 🔄 Hybrid Approach: Desktop ↔ Mobile Sync

### Recommended Architecture

```
Desktop (Privacy-first):
  ├── RDF/Turtle files (human-readable, Git-friendly)
  └── Data at ~/Documents/Friends/main.ttl

Mobile (Performance-first):
  ├── SQLite database (fast, battery-efficient)
  └── Data in app's local storage

Sync Layer:
  ├── Desktop exports to JSON
  ├── Mobile imports JSON → SQLite
  ├── Mobile exports to JSON
  └── Desktop imports JSON → RDF/Turtle
```

### Sync Implementation

```typescript
// Desktop: Export RDF to JSON
class DesktopExporter {
  async exportToMobileFormat(rdfGraph: FriendsGraph): Promise<string> {
    const people = rdfGraph.getPeople();
    const stories = rdfGraph.getStories();
    const preferences = rdfGraph.getAllPreferences();

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      people,
      stories,
      preferences,
    });
  }
}

// Mobile: Import JSON to SQLite
class MobileImporter {
  async importFromDesktop(jsonData: string, db: FriendsDatabase): Promise<void> {
    const data = JSON.parse(jsonData);

    // Clear local data
    await db.clear();

    // Import people
    for (const person of data.people) {
      await db.addPerson(person);
    }

    // Import stories
    for (const story of data.stories) {
      await db.addStory(story);
    }

    // Import preferences
    for (const pref of data.preferences) {
      await db.addPreference(pref);
    }

    console.log(`Imported ${data.people.length} people from desktop`);
  }
}

// Sync via file sharing (AirDrop, Dropbox, etc.)
async function syncDesktopToMobile() {
  // Desktop generates friends-export.json
  const exporter = new DesktopExporter();
  const json = await exporter.exportToMobileFormat(desktopGraph);
  await writeFile('~/Downloads/friends-export.json', json);

  // User transfers file to phone (AirDrop, email, etc.)

  // Mobile imports
  const importer = new MobileImporter();
  const fileContent = await readFile('friends-export.json');
  await importer.importFromDesktop(fileContent, mobileDB);
}
```

---

## 🎯 Final Recommendation

### For Mobile Apps: **SQLite (expo-sqlite)** 🏆

**Why:**
1. ✅ **Native to iOS/Android** - Zero overhead
2. ✅ **10-50x faster** than JavaScript RDF libraries
3. ✅ **Battery efficient** - Uses native C code
4. ✅ **Low memory** - Doesn't load entire DB into RAM
5. ✅ **Mature ecosystem** - Battle-tested, great docs
6. ✅ **Small bundle** - Adds ~0KB (already in OS)

### Full Architecture

```
Desktop (Electron/Tauri):
  Data: RDF/Turtle (~/Documents/Friends/main.ttl)
  Why: Human-readable, Git-friendly, semantic richness

Mobile (Expo React Native):
  Data: SQLite (expo-sqlite)
  Why: Fast, native, battery-efficient

Sync:
  Format: JSON
  Method: File export/import or encrypted cloud sync
```

---

## 📊 Decision Matrix

| Criteria | SQLite | WatermelonDB | RDF (N3.js) | RDF (rdflib.js) |
|----------|--------|--------------|-------------|-----------------|
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Memory** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Battery** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Bundle Size** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Ease of Use** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Semantic** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🚀 Implementation Timeline

### Week 1: Desktop with RDF
- Electron app + N3.js
- Local Turtle files
- Basic CRUD

### Week 2-3: Mobile with SQLite
- Expo app + expo-sqlite
- Same features as desktop
- Optimized for touch

### Week 4: Sync Layer
- JSON export/import
- File-based sync
- Conflict resolution

---

**Bottom Line: Use RDF on desktop for semantic richness, SQLite on mobile for performance. Sync via JSON.**
