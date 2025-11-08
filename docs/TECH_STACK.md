# Technology Stack

**Version**: 1.0
**Last Updated**: 2025-11-08
**Status**: FINALIZED FOR MVP

---

## Executive Summary

**Platform**: Mobile-first (iOS + Android native apps)
**Framework**: Expo (React Native)
**Language**: TypeScript
**Database**: SQLite (local-first)
**AI**: Anthropic Claude 3.5 Sonnet

---

## Core Technologies

### Mobile Platform

```json
{
  "framework": "Expo SDK 51+",
  "runtime": "React Native 0.74+",
  "language": "TypeScript 5.3+",
  "targets": ["iOS 13+", "Android 10+"],
  "distribution": ["App Store", "Google Play Store"]
}
```

**Why Expo?**
- ✅ Fast development with managed workflow
- ✅ Built-in SQLite support (expo-sqlite)
- ✅ Easy OTA updates
- ✅ Strong TypeScript support
- ✅ Great developer experience
- ✅ Easy migration to bare workflow if needed

**Why React Native?**
- ✅ Single codebase for iOS + Android
- ✅ Large ecosystem
- ✅ Native performance
- ✅ Proven at scale (Discord, Shopify, etc.)

---

## Frontend Stack

### UI Framework

**React Native Paper 5**
- Material Design 3 components
- Customizable theme
- Accessibility built-in
- Dark mode support

**Why React Native Paper?**
- ✅ Comprehensive component library
- ✅ Material Design guidelines (familiar UX)
- ✅ Active maintenance
- ✅ TypeScript support
- ✅ Good documentation

**Alternative considered**: Tamagui (rejected - too new, steeper learning curve)

### Navigation

**Expo Router (File-based routing)**
- Automatic routing from file structure
- Deep linking support
- Type-safe navigation
- Web-like routing patterns

```typescript
// Example: app/(tabs)/people/[id].tsx
// Auto-generates route: /people/:id
```

**Why Expo Router?**
- ✅ Simpler than React Navigation setup
- ✅ Type-safe routing
- ✅ Built for Expo
- ✅ Easy deep linking

### State Management

**TanStack Query (React Query)**
- Server state management
- Automatic caching
- Background refetching
- Optimistic updates

**Zustand**
- Client state management
- Simple API
- TypeScript-first
- No boilerplate

```typescript
// Server state: TanStack Query
const { data: people } = useQuery({
  queryKey: ['people'],
  queryFn: () => db.select().from(people).all()
});

// Client state: Zustand
const useAppStore = create<AppState>((set) => ({
  currentUserId: null,
  setCurrentUser: (id) => set({ currentUserId: id })
}));
```

**Why TanStack Query + Zustand?**
- ✅ Separation of concerns (server vs client state)
- ✅ Less boilerplate than Redux
- ✅ Great TypeScript support
- ✅ Perfect for local-first architecture

**Alternatives considered**:
- Redux Toolkit (rejected - too much boilerplate for local-first app)
- React Context only (rejected - doesn't handle async well)

### Forms & Validation

**React Hook Form**
- Performance-optimized
- Minimal re-renders
- Easy validation
- TypeScript support

**Zod**
- Runtime type validation
- Schema-based validation
- TypeScript inference
- Reusable schemas

```typescript
const personSchema = z.object({
  name: z.string().min(2),
  nickname: z.string().optional(),
  relationshipType: z.enum(['friend', 'family', 'colleague'])
});

type PersonFormData = z.infer<typeof personSchema>;
```

**Why React Hook Form + Zod?**
- ✅ Type-safe forms
- ✅ Excellent performance
- ✅ Reuse Zod schemas for API + DB validation
- ✅ Great DX

### Animations & Gestures

**React Native Reanimated 3**
- 60fps animations
- Runs on UI thread
- Gesture support

**React Native Gesture Handler**
- Native gesture recognition
- Drag-and-drop support
- Swipe actions

**Use cases:**
- Drag-and-drop preference ordering
- Swipe to delete
- Pull to refresh
- Smooth transitions

---

## Backend Stack

### Database

**SQLite (expo-sqlite)**
- Local-first storage
- Fast queries
- Offline-first
- No network required

**Drizzle ORM**
- Type-safe queries
- Schema migrations
- TypeScript-first
- Lightweight (<10KB)

```typescript
// Type-safe queries
const users = await db
  .select()
  .from(people)
  .where(eq(people.userId, currentUserId))
  .all();
```

**Why SQLite + Drizzle?**
- ✅ Local-first architecture
- ✅ No backend needed for MVP
- ✅ Type-safe queries
- ✅ Fast performance
- ✅ Works offline
- ✅ Easy migration to cloud sync later

**Alternatives considered**:
- Prisma (rejected - not optimized for mobile)
- WatermelonDB (rejected - complex for MVP)
- Raw SQL (rejected - no type safety)

### Validation

**Zod (Runtime validation)**
- Validate user input
- Validate AI responses
- Validate database writes
- TypeScript inference

```typescript
// Validate AI extraction response
const extractionSchema = z.object({
  people: z.array(personSchema),
  relations: z.array(relationSchema)
});

const validated = extractionSchema.parse(aiResponse);
```

---

## AI/ML Stack

### AI Provider

**Anthropic Claude**
- Model: Claude 3.5 Sonnet
- API: @anthropic-ai/sdk

**Why Claude 3.5 Sonnet?**
- ✅ Best at structured data extraction
- ✅ Large context window (200K tokens)
- ✅ High accuracy for relation extraction
- ✅ Good JSON output
- ✅ Reasonable pricing

**Alternatives considered**:
- GPT-4 (rejected - more expensive, less accurate for structured extraction)
- GPT-3.5 (rejected - lower accuracy)
- Local LLM (rejected - too slow on mobile, large model size)

### Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4000,
  messages: [{ role: 'user', content: prompt }]
});
```

**Cost Estimate**:
- ~$0.02 per story extraction
- ~$0.60 per 30 stories/month
- MVP target: < $5/month/user

---

## Development Tools

### Package Manager

**npm** (default with Expo)
- Comes with Node.js
- Fast with npm 9+
- Good lockfile (package-lock.json)

**Alternative**: pnpm (faster, but adds complexity)

### Code Quality

**ESLint**
- Lint TypeScript code
- Catch bugs early
- Enforce code style

**Prettier**
- Auto-format code
- Consistent style
- Integrates with ESLint

**Configuration**:
```json
{
  "extends": [
    "expo",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ]
}
```

### Testing

**Jest**
- Unit tests
- Integration tests
- Mocking support

**React Native Testing Library**
- Component tests
- User-centric testing
- Accessibility testing

**Detox (Future - Phase 2)**
- E2E testing
- Real device testing
- Automated UI tests

**Test Coverage Goal**: 80% for business logic

---

## File Management

### Images

**expo-image**
- Faster than React Native Image
- Better caching
- Placeholder support
- Blurhash support

**expo-image-manipulator**
- Resize images
- Compress before upload
- Generate thumbnails

**expo-image-picker**
- Camera integration
- Photo library access
- Cropping support

### Files

**expo-file-system**
- Local file storage
- Read/write files
- Cache management

**expo-document-picker**
- Import files
- Export data
- Backup/restore

---

## Security

### Encryption

**expo-crypto**
- Hash passwords
- Generate UUIDs
- Encrypt secrets

```typescript
import * as Crypto from 'expo-crypto';

const encrypted = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  secretText
);
```

### Secure Storage

**expo-secure-store**
- Store API keys
- Store sensitive data
- Keychain integration (iOS)
- Keystore integration (Android)

---

## Phase 4+ Technologies (Future)

### Authentication

**Magic Links** (Planned)
- Passwordless auth
- Email-based
- Easy UX

**Implementation**: Custom backend or Supabase

### Cloud Sync

**Options (TBD)**:
1. Supabase
   - PostgreSQL backend
   - Real-time sync
   - Auth built-in
   - File storage

2. Firebase
   - Firestore
   - Real-time sync
   - Auth built-in
   - Cloud storage

3. Custom Backend
   - tRPC API
   - PostgreSQL
   - S3 for files
   - More control

**Decision**: Deferred to Phase 4 planning

### Analytics

**Options (TBD)**:
- PostHog (privacy-focused)
- Amplitude (feature-rich)
- Mixpanel (good mobile SDK)

---

## Development Environment

### Required Software

```bash
# Node.js 18+ (LTS)
node --version

# npm 9+
npm --version

# Expo CLI
npm install -g expo-cli

# iOS (macOS only)
# - Xcode 15+
# - CocoaPods
xcode-select --install
sudo gem install cocoapods

# Android
# - Android Studio
# - Android SDK 33+
# - Java 11
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "expo.vscode-expo-tools",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## Project Structure

```
friends-app/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── people/        # People list
│   │   └── settings.tsx   # Settings
│   ├── person/[id].tsx    # Person detail
│   └── _layout.tsx        # Root layout
│
├── components/            # Reusable components
│   ├── ui/               # UI components (Button, Card, etc.)
│   ├── people/           # People-specific components
│   └── forms/            # Form components
│
├── lib/                   # Business logic
│   ├── db/               # Database
│   │   ├── schema.ts     # Drizzle schema
│   │   ├── index.ts      # DB instance
│   │   └── migrations/   # SQL migrations
│   ├── ai/               # AI extraction
│   │   ├── extraction.ts # Main extraction logic
│   │   └── prompts.ts    # Prompt templates
│   ├── validation/       # Zod schemas
│   └── utils/            # Helper functions
│
├── hooks/                 # Custom hooks
│   ├── usePersons.ts
│   ├── useRelations.ts
│   └── useExtraction.ts
│
├── store/                 # Zustand stores
│   └── appStore.ts
│
├── types/                 # TypeScript types
│   ├── database.ts
│   ├── ai.ts
│   └── index.ts
│
├── assets/                # Images, fonts, etc.
│
├── __tests__/             # Tests
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── app.json              # Expo config
├── package.json
├── tsconfig.json
└── .env                  # Environment variables
```

---

## Environment Variables

```bash
# .env
ANTHROPIC_API_KEY=your_api_key_here

# Future (Phase 4)
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
```

---

## Performance Targets

| **Metric** | **Target** | **Tool** |
|------------|------------|----------|
| App launch time | < 2s | Flipper |
| Screen transitions | 60fps | React Native Reanimated |
| Database queries | < 100ms (p95) | Drizzle logging |
| AI extraction | < 5s | Anthropic API metrics |
| Bundle size | < 10MB | expo-updates |
| Memory usage | < 150MB | Xcode Instruments |

---

## Cost Estimate (MVP)

| **Service** | **Cost/Month** | **Notes** |
|-------------|---------------|-----------|
| Anthropic API | $5-10 | ~250 extractions/month |
| App Store | $99/year | Apple Developer Program |
| Google Play | $25 one-time | Google Play Console |
| **Total (Year 1)** | **$184** | Very affordable! |

**Phase 4+ costs** (cloud sync):
- Supabase: Free tier (good for 50K users)
- Domain: $12/year
- **Total Phase 4**: ~$196/year (still cheap!)

---

## Deployment

### Development

```bash
# Start development server
npx expo start

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Physical device
# Scan QR code with Expo Go app
```

### Production Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both
eas build --platform all
```

### Over-the-Air Updates

```bash
# Publish update (no app store review needed)
eas update --auto
```

---

## Migration Path

### Phase 1 → Phase 2
- Add voice notes (expo-av)
- Add photo recognition (expo-camera)
- Improve AI prompts

### Phase 2 → Phase 3
- Add analytics (PostHog)
- Add crash reporting (Sentry)
- Optimize performance

### Phase 3 → Phase 4
- Add authentication (Magic links)
- Add cloud sync (Supabase)
- Add file uploads (S3 or Supabase Storage)
- Migrate SQLite → PostgreSQL (via sync, not migration!)

---

## Technology Decision Matrix

| **Decision** | **Chosen** | **Alternative** | **Reason** |
|--------------|------------|-----------------|------------|
| Platform | Expo | React Native CLI | Easier setup, managed workflow |
| UI Library | RN Paper | Tamagui | Mature, Material Design, proven |
| State | TanStack Query + Zustand | Redux Toolkit | Less boilerplate, better DX |
| ORM | Drizzle | Prisma | Lightweight, TS-first, mobile-optimized |
| Forms | React Hook Form | Formik | Better performance |
| Validation | Zod | Yup | Better TS inference |
| AI | Claude 3.5 | GPT-4 | Better structured extraction |
| Navigation | Expo Router | React Navigation | Simpler, type-safe |

---

## Final Tech Stack Summary

```typescript
const techStack = {
  platform: 'Expo + React Native',
  language: 'TypeScript',
  ui: 'React Native Paper',
  navigation: 'Expo Router',
  state: {
    server: 'TanStack Query',
    client: 'Zustand'
  },
  database: {
    engine: 'SQLite',
    orm: 'Drizzle'
  },
  forms: 'React Hook Form + Zod',
  ai: 'Anthropic Claude 3.5 Sonnet',
  testing: 'Jest + React Native Testing Library',
  animations: 'Reanimated + Gesture Handler'
};
```

**Status**: ✅ **FINALIZED - READY FOR DEVELOPMENT**

---

**End of TECH_STACK.md**
