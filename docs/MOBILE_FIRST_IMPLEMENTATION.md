# Mobile-First Implementation Guide - Phase 1

**Building Friends app for iOS and Android using Expo**

---

## ✅ Final Decisions

1. **Platform:** Mobile ONLY (iOS + Android native apps)
2. **Timeline:** Phase 1 (3-4 months)
3. **UI:** React Native Paper (Material Design)
4. **Distribution:** App Store + Play Store (native apps)
5. **Desktop:** Deferred to Phase 2+ (forget about it for now)

**No PWA, no Electron, no web - just native mobile apps! 📱**

---

## 🎨 Should You Design Screens in Figma First?

### **YES - Highly Recommended!** ⭐

**Why Figma before coding:**

✅ **Faster iteration** - Change designs in minutes vs hours of code
✅ **Clearer vision** - Everyone understands what you're building
✅ **Catch UX issues early** - Before writing a single line of code
✅ **Better estimates** - Know exactly what screens/components you need
✅ **Handoff to developers** - If you hire help later
✅ **Component library** - Build once, reuse everywhere

**What to design in Figma:**

### **Core Screens (Must Have):**
1. **Onboarding** (3 screens)
   - Welcome
   - How it works
   - Add first person

2. **Main App** (5 screens)
   - People List (home)
   - Person Detail (with tabs)
   - Add/Edit Person
   - Add Preference (drag-and-drop mockup)
   - Search

3. **Features** (3 screens)
   - Secrets (unlock screen + list)
   - Timeline view
   - Settings

4. **States** (Important!)
   - Empty states (no people yet)
   - Loading states
   - Error states
   - Success confirmations

**Total:** ~15 screens + component library

### **Figma Process:**

```
Week 1: Wireframes (low-fidelity)
├── Sketch all screens
├── Map user flows
└── Get feedback

Week 2: High-fidelity designs
├── Add colors, icons, images
├── Create component library
└── Design system (spacing, typography)

Week 3: Prototype
├── Link screens together
├── Add interactions
└── Test with users (friends/family)

Then: Start coding with clear blueprint!
```

### **Figma Alternative (Faster):**

If you want to start coding NOW:
- Skip Figma
- Use React Native Paper examples as reference
- Design directly in code
- Iterate as you build

**My recommendation:**
- If solo + want to ship fast → Skip Figma, design in code
- If team + want quality → Use Figma first

**For you:** Since you're asking questions about platform strategy, I suspect you might benefit from **2 weeks of Figma design** to clarify your vision before coding.

---

## 📱 Final Technology Stack

### **Platform: Expo (React Native)**

```json
{
  "platform": "Expo SDK 51",
  "targets": ["iOS", "Android"],
  "deployment": ["App Store", "Google Play Store"],
  "language": "TypeScript",
  "ui": "React Native Paper 5",
  "database": "expo-sqlite + Drizzle ORM",
  "navigation": "Expo Router (file-based)",
  "state": "TanStack Query + Zustand",
  "forms": "React Hook Form + Zod",
  "gestures": "react-native-gesture-handler + Reanimated",
  "images": "expo-image + expo-image-manipulator"
}
```

---

## 🚀 Complete Setup

### **Step 1: Create Expo Project**

```bash
# Create project with Expo Router
npx create-expo-app@latest friends-app --template tabs

cd friends-app

# Install iOS dependencies (if on macOS)
npx pod-install
```

### **Step 2: Install Core Dependencies**

```bash
# Database
npx expo install expo-sqlite expo-file-system
npm install drizzle-orm
npm install -D drizzle-kit

# UI Components
npm install react-native-paper react-native-vector-icons
npm install react-native-safe-area-context

# Navigation (already included with tabs template)
# expo-router is pre-installed

# State Management
npm install @tanstack/react-query zustand

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Gestures & Animations (for drag-and-drop)
npx expo install react-native-gesture-handler react-native-reanimated

# Images
npx expo install expo-image expo-image-manipulator expo-image-picker

# Crypto (for secrets encryption)
npx expo install expo-crypto

# Testing
npm install -D jest @testing-library/react-native
```

### **Step 3: Configure React Native Paper**

```typescript
// app/_layout.tsx
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Stack } from 'expo-router';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    secondary: '#03DAC6',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
```

### **Step 4: Setup Database**

```typescript
// lib/db/index.ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expo = SQLite.openDatabaseSync('friends.db');
export const db = drizzle(expo, { schema });

// Initialize database on first launch
export async function initDatabase() {
  // Run migrations
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Create local user if doesn't exist
  const users = await db.select().from(schema.users).limit(1);
  if (users.length === 0) {
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      displayName: 'Me',
      createdAt: new Date(),
    });
  }
}
```

### **Step 5: Copy Database Schema**

Copy the complete schema from `docs/DATABASE_SCHEMA_FINAL.md` to:
```
lib/db/schema.ts
```

Adjust for Expo:
```typescript
// Use expo-sqlite specific types
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Rest of schema is the same!
```

---

## 📁 Mobile-Optimized Project Structure

```
friends-app/
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root layout with providers
│   ├── (tabs)/                 # Tab navigation
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── index.tsx           # People list (home)
│   │   ├── timeline.tsx        # Timeline view
│   │   └── settings.tsx        # Settings
│   ├── person/
│   │   ├── [id].tsx            # Person detail (dynamic route)
│   │   └── add.tsx             # Add person
│   ├── preferences/
│   │   └── add.tsx             # Add preference (drag-and-drop)
│   ├── secrets/
│   │   ├── index.tsx           # Secrets list
│   │   └── unlock.tsx          # Unlock screen
│   └── onboarding/
│       ├── welcome.tsx
│       ├── how-it-works.tsx
│       └── first-person.tsx
│
├── components/                 # Reusable components
│   ├── PersonCard.tsx
│   ├── PreferenceChip.tsx
│   ├── DragDropZone.tsx
│   ├── PreferenceLibrary.tsx
│   └── EmptyState.tsx
│
├── lib/                        # Business logic
│   ├── db/                     # Database
│   │   ├── schema.ts           # Drizzle schema
│   │   ├── index.ts            # DB connection
│   │   └── migrations/
│   ├── services/               # Business logic
│   │   ├── people.ts           # Person CRUD
│   │   ├── relations.ts        # Relations CRUD
│   │   ├── secrets.ts          # Encryption
│   │   └── images.ts           # Image optimization
│   ├── hooks/                  # React Query hooks
│   │   ├── usePeople.ts
│   │   ├── useRelations.ts
│   │   └── useSecrets.ts
│   ├── stores/                 # Zustand stores
│   │   ├── ui.ts               # UI state
│   │   └── auth.ts             # Local user
│   └── constants/
│       └── preferences.ts      # 100+ predefined items
│
├── assets/                     # Images, fonts
└── tests/                      # Tests
    ├── encryption.test.ts      # CRITICAL
    └── autolock.test.ts        # CRITICAL
```

---

## 🎨 React Native Paper Components

### **Key Components You'll Use:**

```typescript
import {
  Button,
  Card,
  Chip,
  Dialog,
  FAB,
  List,
  Searchbar,
  Surface,
  TextInput,
  Portal,
  Modal,
  Snackbar,
  Avatar,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
```

### **Example: Person Card**

```tsx
// components/PersonCard.tsx
import { Card, Avatar, Chip } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

interface PersonCardProps {
  person: {
    id: string;
    name: string;
    photoUri?: string;
    relationshipType: string;
  };
  onPress: () => void;
}

export function PersonCard({ person, onPress }: PersonCardProps) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Title
        title={person.name}
        subtitle={person.relationshipType}
        left={(props) => (
          person.photoUri ? (
            <Avatar.Image {...props} source={{ uri: person.photoUri }} />
          ) : (
            <Avatar.Text {...props} label={person.name[0]} />
          )
        )}
      />
      <Card.Content>
        <View style={styles.tags}>
          <Chip icon="heart">Likes ice cream</Chip>
          <Chip icon="map-marker">Italy</Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});
```

### **Example: People List Screen**

```tsx
// app/(tabs)/index.tsx
import { View, FlatList, StyleSheet } from 'react-native';
import { Searchbar, FAB } from 'react-native-paper';
import { PersonCard } from '@/components/PersonCard';
import { usePeople } from '@/lib/hooks/usePeople';
import { router } from 'expo-router';

export default function PeopleListScreen() {
  const { data: people, isLoading } = usePeople();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search people..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={people}
        renderItem={({ item }) => (
          <PersonCard
            person={item}
            onPress={() => router.push(`/person/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/person/add')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { margin: 16 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
```

---

## 🧪 Testing Setup (Minimal + Critical)

### **Critical Tests Only:**

```typescript
// tests/encryption.test.ts
import { encryptSecret, decryptSecret } from '@/lib/services/secrets';

describe('Encryption', () => {
  it('encrypts and decrypts correctly', () => {
    const content = 'Secret note about Ola';
    const password = 'masterPassword123';

    const encrypted = encryptSecret(content, password);
    const decrypted = decryptSecret(encrypted, password);

    expect(decrypted).toBe(content);
    expect(encrypted).not.toContain(content); // Ensure it's encrypted
  });

  it('fails with wrong password', () => {
    const encrypted = encryptSecret('secret', 'password1');
    expect(() => decryptSecret(encrypted, 'wrongPassword')).toThrow();
  });

  it('generates unique encryptions for same content', () => {
    const content = 'secret';
    const password = 'pass';

    const encrypted1 = encryptSecret(content, password);
    const encrypted2 = encryptSecret(content, password);

    expect(encrypted1).not.toBe(encrypted2); // Different salt/IV
    expect(decryptSecret(encrypted1, password)).toBe(content);
    expect(decryptSecret(encrypted2, password)).toBe(content);
  });
});
```

```typescript
// tests/autolock.test.ts
import { unlockSecrets, isUnlocked, trackActivity } from '@/lib/services/secrets';

describe('Auto-lock after 5 minutes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('locks after 5 minutes of inactivity', () => {
    unlockSecrets('password');
    expect(isUnlocked()).toBe(true);

    // Fast-forward 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);

    expect(isUnlocked()).toBe(false);
  });

  it('resets timer on user activity', () => {
    unlockSecrets('password');

    // 4 minutes pass
    jest.advanceTimersByTime(4 * 60 * 1000);

    // User does something
    trackActivity();

    // Another 4 minutes
    jest.advanceTimersByTime(4 * 60 * 1000);

    // Still unlocked (timer was reset)
    expect(isUnlocked()).toBe(true);
  });

  it('locks immediately on manual lock', () => {
    unlockSecrets('password');
    expect(isUnlocked()).toBe(true);

    lockSecrets();

    expect(isUnlocked()).toBe(false);
  });
});
```

**Run tests:**
```bash
npm test
```

---

## 📱 Development Workflow

### **1. Start Development Server**

```bash
npx expo start
```

**Test on devices:**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

### **2. Database Development**

```bash
# Generate migrations
npx drizzle-kit generate:sqlite

# View database in Drizzle Studio
npx drizzle-kit studio

# Opens browser at http://localhost:4983
```

### **3. Build for Testing**

```bash
# iOS (requires macOS + Xcode)
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### **4. Build for Production**

```bash
# Setup EAS (Expo Application Services)
eas build:configure

# iOS (App Store)
eas build --profile production --platform ios

# Android (Play Store)
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 🎯 Phase 1 Development Timeline

### **Week 1-2: Setup & Design**
- ✅ Figma designs (if you choose to do it)
- ✅ Project setup
- ✅ Database schema implementation
- ✅ Local user initialization

### **Week 3-4: Core CRUD**
- ✅ People list screen
- ✅ Add person screen
- ✅ Person detail screen
- ✅ Edit/delete person

### **Week 5-6: Relations**
- ✅ Predefined preference library (100+ items)
- ✅ Add preference screen
- ✅ Drag-and-drop interface (or tap-based alternative)
- ✅ Display relations on person detail

### **Week 7-8: Advanced Features**
- ✅ Profile photo upload
- ✅ Photo optimization
- ✅ Search & filtering

### **Week 9-10: Secrets & Security**
- ✅ Secrets encryption
- ✅ Unlock screen
- ✅ Auto-lock timer
- ✅ **Critical tests** (encryption + timer)

### **Week 11-12: Polish**
- ✅ Onboarding flow
- ✅ Empty states
- ✅ Loading states
- ✅ Error handling
- ✅ Settings screen

### **Week 13-14: Testing & Launch**
- ✅ Manual testing on real devices
- ✅ Bug fixes
- ✅ TestFlight (iOS) / Internal Testing (Android)
- ✅ Submit to App Store / Play Store

**Total: 14 weeks (~3.5 months)**

---

## 🎨 Figma Design System Recommendation

If you decide to design in Figma first:

### **What to Include:**

1. **Color Palette**
   - Primary: #6200EE (Material Purple)
   - Secondary: #03DAC6 (Teal)
   - Background: #FFFFFF
   - Surface: #F5F5F5
   - Error: #B00020

2. **Typography**
   - Headline: Roboto Bold 24px
   - Title: Roboto Medium 20px
   - Body: Roboto Regular 16px
   - Caption: Roboto Regular 12px

3. **Spacing System**
   - 4px, 8px, 16px, 24px, 32px (multiples of 8)

4. **Components**
   - Cards
   - Buttons
   - Input fields
   - Chips
   - Bottom sheets
   - Modals

5. **Screens** (15 total)
   - As listed earlier

**Figma Resources:**
- Use Material Design 3 UI kit
- Export to Expo with Figma to React Native plugins

---

## 📦 Complete package.json

```json
{
  "name": "friends-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest",
    "lint": "eslint .",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "expo": "^51.0.0",
    "expo-router": "^3.5.0",
    "expo-sqlite": "^14.0.0",
    "expo-file-system": "^17.0.0",
    "expo-image": "^1.12.0",
    "expo-image-manipulator": "^12.0.0",
    "expo-image-picker": "^15.0.0",
    "expo-crypto": "^13.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-paper": "^5.12.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-safe-area-context": "^4.10.0",
    "react-native-gesture-handler": "^2.16.0",
    "react-native-reanimated": "^3.10.0",
    "drizzle-orm": "^0.32.0",
    "@tanstack/react-query": "^5.51.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3",
    "drizzle-kit": "^0.23.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.5.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  }
}
```

---

## ✅ Summary

### **Your Decisions:**
1. ✅ **Mobile-only** (iOS + Android)
2. ✅ **Phase 1** (3-4 months)
3. ✅ **React Native Paper** (Material Design)
4. ✅ **App Store + Play Store** (native distribution)
5. ✅ **No desktop** (deferred)

### **Figma Recommendation:**
- ⭐ **Yes, design screens first** if you want:
  - Clearer vision
  - Faster iteration
  - Fewer code rewrites
- ⚠️ **Skip Figma** if you want:
  - Start coding immediately
  - Learn by building
  - Iterate in code

**My recommendation:** **2 weeks of Figma design** → saves time in the long run

### **Next Steps:**
1. Decide: Figma or code-first?
2. Run setup commands
3. Copy database schema from docs/DATABASE_SCHEMA_FINAL.md
4. Build first screen (People List)
5. Iterate!

---

**Ready to start? Let me know if you want:**
1. Figma design guidance
2. Help with first screen implementation
3. More questions answered

🚀
