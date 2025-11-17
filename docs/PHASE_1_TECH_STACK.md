# Phase 1 Implementation Guide - Technology Stack

**Complete technology recommendations for building the Friends MVP**

---

## 🎯 Phase 1 Goals Recap

**What we're building:**
- Desktop app (macOS, Windows, Linux)
- 100% local, offline-first
- Manual drag-and-drop interface
- SQLite + Drizzle ORM
- Up to 50 people (free tier)
- Profile photos + secrets
- No server, no AI

**Target timeline:** 3-4 months for MVP

---

## 🏗️ Recommended Technology Stack

### **1. Desktop App Framework**

#### **Recommended: Tauri** ⭐

**Why Tauri over Electron:**

| Feature | Tauri | Electron |
|---------|-------|----------|
| **Bundle Size** | ~3-10 MB | ~50-100 MB |
| **Memory Usage** | ~50-100 MB | ~200-400 MB |
| **Backend** | Rust | Node.js |
| **Security** | More secure (sandboxed) | Less secure |
| **Native Feel** | Uses system WebView | Chromium bundle |
| **Startup Time** | Faster | Slower |
| **Learning Curve** | Steeper (Rust) | Easier (JS/TS) |

**Verdict:** Tauri for production, but consider Electron if:
- You need to ship in 2-3 months (faster development)
- You don't know Rust
- You need maximum compatibility

```bash
# Tauri setup
npm create tauri-app@latest friends-app
cd friends-app
npm install
npm run tauri dev
```

#### **Alternative: Electron**

```bash
# Electron setup (if you choose this)
npm create @quick-start/electron friends-app
cd friends-app
npm install
npm run dev
```

**My recommendation:** Start with **Electron** for speed, migrate to Tauri later if needed.

---

### **2. Frontend Framework**

#### **React 18 + TypeScript + Vite** ⭐

Already decided, great choice!

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.1",
    "@vitejs/plugin-react": "^4.3.1"
  }
}
```

**Why this stack:**
- ✅ React: Most popular, huge ecosystem
- ✅ TypeScript: Type safety, fewer bugs
- ✅ Vite: Fastest build tool, instant HMR

---

### **3. Database Layer**

#### **SQLite + Drizzle ORM** ⭐

Already decided!

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

**Drizzle config:**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './friends.db', // Local file
  },
} satisfies Config;
```

**Generate migrations:**
```bash
npx drizzle-kit generate:sqlite
npx drizzle-kit push:sqlite
```

**Alternative: Prisma** (if you prefer)
- Pros: Better TypeScript DX, visual studio
- Cons: Larger bundle, slower queries, less control

**My recommendation:** Stick with **Drizzle** (lighter, faster, more control).

---

### **4. UI Component Library**

#### **Recommended: shadcn/ui** ⭐

**Why shadcn over others:**

| Library | Bundle Size | Customizable | Accessible | Cost |
|---------|-------------|--------------|------------|------|
| **shadcn/ui** | Small (tree-shakable) | ✅✅✅ | ✅✅✅ | Free |
| Material UI | Large | ⚠️ | ✅✅ | Free |
| Ant Design | Very Large | ⚠️ | ✅ | Free |
| Chakra UI | Medium | ✅✅ | ✅✅ | Free |
| Mantine | Medium | ✅✅ | ✅✅ | Free |

**shadcn/ui advantages:**
- Copy-paste components (you own the code)
- Built on Radix UI (primitives are battle-tested)
- Tailwind CSS based
- Tiny bundle size (only ship what you use)
- Beautiful defaults

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
```

**For drag-and-drop:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Alternative:** If you hate Tailwind, use **Mantine** instead.

---

### **5. Styling**

#### **Tailwind CSS** ⭐

Already works perfectly with shadcn/ui!

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Alternative: CSS Modules** (if you prefer scoped styles)

---

### **6. State Management**

#### **Recommended: TanStack Query (React Query) + Zustand** ⭐

**TanStack Query for server/database state:**

```bash
npm install @tanstack/react-query
```

```typescript
// Perfect for database queries
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db.select().from(people).where(eq(people.userId, userId));
    },
  });
}

function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return createPerson(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
```

**Zustand for UI state:**

```bash
npm install zustand
```

```typescript
// For global UI state (modals, sidebar, etc.)
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentView: 'people' | 'timeline' | 'settings';
  setView: (view: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  currentView: 'people',
  setView: (view) => set({ currentView: view }),
}));
```

**Why not Redux?** Too much boilerplate for local-first app.

---

### **7. Routing**

#### **TanStack Router** or **React Router v7**

```bash
# Option 1: TanStack Router (newer, type-safe)
npm install @tanstack/react-router

# Option 2: React Router (battle-tested)
npm install react-router-dom
```

**For desktop app, you need:**
- `/` - People list
- `/people/:id` - Person detail
- `/settings` - Settings
- `/archived` - Archived people

**Simple routing example:**

```typescript
// With React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<PeopleListPage />} />
    <Route path="/people/:id" element={<PersonDetailPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/archived" element={<ArchivedPeoplePage />} />
  </Routes>
</BrowserRouter>
```

---

### **8. Form Handling**

#### **React Hook Form + Zod** ⭐

```bash
npm install react-hook-form zod @hookform/resolvers
```

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nickname: z.string().optional(),
  relationshipType: z.enum(['friend', 'family', 'colleague', 'acquaintance', 'partner']),
  metDate: z.date().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

function PersonForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
  });

  const onSubmit = (data: PersonFormData) => {
    createPerson(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      {/* ... */}
    </form>
  );
}
```

**Why Zod?** Runtime validation + TypeScript types in one.

---

### **9. Image Handling**

#### **Sharp (for optimization)**

```bash
npm install sharp
```

```typescript
import sharp from 'sharp';

async function optimizeProfilePhoto(filePath: string): Promise<string> {
  const outputPath = path.join(PHOTOS_DIR, `${crypto.randomUUID()}.jpg`);

  await sharp(filePath)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);

  return outputPath;
}
```

---

### **10. Secrets Encryption**

#### **Node.js Crypto (built-in)**

```typescript
import crypto from 'crypto';

export function encryptSecret(content: string, password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${salt}:${iv.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encryptedData: string, password: string): string {
  const [salt, ivHex, encrypted] = encryptedData.split(':');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

### **11. Testing**

#### **Vitest + React Testing Library + Playwright**

```bash
# Unit tests
npm install -D vitest @testing-library/react @testing-library/jest-dom

# E2E tests
npm install -D @playwright/test
```

**Unit test example:**

```typescript
import { render, screen } from '@testing-library/react';
import { PersonCard } from './PersonCard';

test('renders person name', () => {
  render(<PersonCard person={{ name: 'Ola', id: '1' }} />);
  expect(screen.getByText('Ola')).toBeInTheDocument();
});
```

**E2E test example:**

```typescript
import { test, expect } from '@playwright/test';

test('create new person', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('text=Add Person');
  await page.fill('input[name="name"]', 'Ola');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Ola')).toBeVisible();
});
```

---

### **12. Code Quality**

#### **ESLint + Prettier + Husky**

```bash
npm install -D eslint prettier eslint-config-prettier
npm install -D husky lint-staged
npx husky install
```

**.eslintrc.json:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ]
}
```

**package.json:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

---

### **13. Icons**

#### **Lucide React** ⭐

```bash
npm install lucide-react
```

```tsx
import { Heart, User, Calendar, Settings } from 'lucide-react';

<Heart className="w-5 h-5 text-red-500" />
```

**Why Lucide?** Beautiful, consistent, tree-shakable, actively maintained.

---

## 📁 Recommended Project Structure

```
friends-app/
├── src/
│   ├── main.ts                 # Electron/Tauri main process
│   ├── App.tsx                 # Root React component
│   ├── main.tsx                # React entry point
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── input.tsx
│   │   ├── PersonCard.tsx
│   │   ├── PreferenceLibrary.tsx
│   │   └── DragDropZone.tsx
│   │
│   ├── pages/                  # Route pages
│   │   ├── PeopleListPage.tsx
│   │   ├── PersonDetailPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── ArchivedPeoplePage.tsx
│   │
│   ├── db/                     # Database layer
│   │   ├── schema.ts           # Drizzle schema (all tables)
│   │   ├── index.ts            # DB connection
│   │   ├── queries.ts          # Reusable queries
│   │   └── migrations/         # SQL migrations
│   │
│   ├── services/               # Business logic
│   │   ├── auth.ts             # Local user management
│   │   ├── people.ts           # Person CRUD
│   │   ├── relations.ts        # Relation CRUD
│   │   ├── secrets.ts          # Encryption/decryption
│   │   ├── images.ts           # Image optimization
│   │   └── export.ts           # JSON export/import
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── usePeople.ts        # React Query hooks
│   │   ├── useRelations.ts
│   │   └── useSecrets.ts
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── ui.ts               # UI state
│   │   └── settings.ts         # User settings
│   │
│   ├── lib/                    # Utilities
│   │   ├── utils.ts            # Helper functions
│   │   ├── constants.ts        # Constants
│   │   └── preferences.ts      # Predefined preference library
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts            # Shared types
│   │
│   └── styles/                 # Global styles
│       └── globals.css
│
├── public/                     # Static assets
│   └── icons/
│
├── drizzle/                    # Generated migrations
├── tests/                      # Test files
│   ├── unit/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── drizzle.config.ts
└── README.md
```

---

## 🚀 Getting Started - Step by Step

### **Phase 0: Setup (Week 1)**

```bash
# 1. Create project
npm create vite@latest friends-app -- --template react-ts
cd friends-app

# 2. Install dependencies
npm install

# 3. Add Electron (or Tauri)
npm install -D electron electron-builder
npm install -D @types/electron

# 4. Add Tailwind + shadcn
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init

# 5. Add database
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# 6. Add state management
npm install @tanstack/react-query zustand

# 7. Add routing
npm install react-router-dom

# 8. Add forms
npm install react-hook-form zod @hookform/resolvers

# 9. Add drag-and-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# 10. Add image optimization
npm install sharp

# 11. Add icons
npm install lucide-react

# 12. Add testing
npm install -D vitest @testing-library/react @playwright/test

# 13. Add code quality
npm install -D eslint prettier husky lint-staged
```

### **Phase 1: Database Setup (Week 1-2)**

1. Create `src/db/schema.ts` with all tables (use DATABASE_SCHEMA_FINAL.md)
2. Generate migrations: `npx drizzle-kit generate:sqlite`
3. Create database connection in `src/db/index.ts`
4. Create local user initialization
5. Test database queries

### **Phase 2: Core UI (Week 2-4)**

1. Set up routing
2. Create main layout (sidebar + content)
3. Build PersonCard component
4. Build PeopleListPage
5. Build PersonDetailPage
6. Add basic CRUD operations

### **Phase 3: Drag & Drop (Week 4-6)**

1. Build PreferenceLibrary component (100+ predefined items)
2. Implement drag-and-drop zones
3. Add relation creation via drag
4. Build relation list display
5. Add intensity sliders

### **Phase 4: Advanced Features (Week 6-10)**

1. Profile photo upload + optimization
2. Secrets with encryption
3. Search and filtering
4. Timeline view
5. Export/Import JSON
6. Archived people view

### **Phase 5: Polish (Week 10-12)**

1. Onboarding flow
2. Settings page
3. Empty states
4. Loading states
5. Error handling
6. Keyboard shortcuts
7. Testing

### **Phase 6: Package & Deploy (Week 12-14)**

1. Build production bundle
2. Test on all platforms
3. Create installers (DMG, EXE, AppImage)
4. Set up auto-updates (optional)
5. Beta testing

---

## 🎯 Key Decisions You Need to Make

### **1. Desktop Framework**

**Option A: Electron** (Recommended for speed)
- ✅ Faster development (pure JS/TS)
- ✅ Larger ecosystem, more resources
- ❌ Larger bundle size (~50-100 MB)
- ❌ More memory usage

**Option B: Tauri** (Recommended for production)
- ✅ Smaller bundle (~3-10 MB)
- ✅ Better security
- ✅ Lower memory usage
- ❌ Steeper learning curve (Rust)
- ❌ Slower initial development

**My recommendation:** Start with **Electron**, migrate to Tauri in Phase 2 if needed.

### **2. UI Component Library**

**Option A: shadcn/ui** (Recommended)
- ✅ Full control (you own the code)
- ✅ Tailwind-based
- ✅ Tiny bundle size
- ❌ Manual copying of components

**Option B: Mantine** (Alternative)
- ✅ Pre-built components
- ✅ Great docs
- ✅ No Tailwind needed
- ❌ Slightly larger bundle

**My recommendation:** **shadcn/ui** for customization and bundle size.

### **3. Testing Strategy**

**Option A: Minimal Testing** (Faster MVP)
- Just E2E tests with Playwright
- Manual testing for most features
- Add unit tests later

**Option B: Comprehensive Testing** (Better quality)
- Unit tests for business logic
- Component tests for UI
- E2E tests for critical flows
- TDD approach

**My recommendation:** Start with **Option A**, add tests for critical paths (encryption, database).

---

## 📦 Complete package.json

```json
{
  "name": "friends-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:push": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.51.1",
    "zustand": "^4.5.4",
    "drizzle-orm": "^0.32.1",
    "better-sqlite3": "^11.1.2",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react-hook-form": "^7.52.1",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.417.0",
    "sharp": "^0.33.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/better-sqlite3": "^7.6.11",
    "typescript": "^5.5.3",
    "vite": "^5.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^31.3.1",
    "electron-builder": "^24.13.3",
    "tailwindcss": "^3.4.6",
    "postcss": "^8.4.40",
    "autoprefixer": "^10.4.19",
    "drizzle-kit": "^0.23.1",
    "vitest": "^2.0.4",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@playwright/test": "^1.45.3",
    "eslint": "^9.8.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.3.3",
    "husky": "^9.1.4",
    "lint-staged": "^15.2.8"
  }
}
```

---

## ⚠️ Potential Challenges & Solutions

### **Challenge 1: SQLite File Location**

**Problem:** Where to store `friends.db`?

**Solution:**
```typescript
import { app } from 'electron';
import path from 'path';

const DB_PATH = path.join(app.getPath('userData'), 'friends.db');
```

- macOS: `~/Library/Application Support/Friends/friends.db`
- Windows: `%APPDATA%/Friends/friends.db`
- Linux: `~/.config/Friends/friends.db`

### **Challenge 2: File Access in Electron**

**Problem:** React can't access file system directly.

**Solution:** Use IPC (Inter-Process Communication)

```typescript
// Main process
ipcMain.handle('db:query', async (event, query) => {
  return await db.select().from(people);
});

// Renderer process
const people = await window.electron.invoke('db:query');
```

### **Challenge 3: Image Storage**

**Problem:** Where to store profile photos?

**Solution:**
```typescript
const PHOTOS_DIR = path.join(app.getPath('userData'), 'photos');
```

### **Challenge 4: Bundle Size with Sharp**

**Problem:** Sharp adds ~30 MB to bundle.

**Solution:** Mark as external in electron-builder:
```json
{
  "build": {
    "asarUnpack": ["**/node_modules/sharp/**"]
  }
}
```

---

## 📈 Development Timeline Estimate

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Setup | 1 week | Project scaffolded, dependencies installed |
| Database | 1-2 weeks | Schema created, migrations, queries working |
| Core UI | 2-3 weeks | People list, person detail, basic CRUD |
| Drag & Drop | 2-3 weeks | Preference library, relation creation |
| Advanced | 4 weeks | Photos, secrets, search, export |
| Polish | 2 weeks | Onboarding, settings, error handling |
| Testing | 2 weeks | E2E tests, bug fixes |
| **Total** | **14-17 weeks** | **~3-4 months** |

---

## ✅ Quick Start Checklist

- [ ] Choose Electron vs Tauri
- [ ] Create project with Vite
- [ ] Install all dependencies
- [ ] Set up Tailwind + shadcn/ui
- [ ] Create database schema
- [ ] Generate migrations
- [ ] Test database connection
- [ ] Create first component (PersonCard)
- [ ] Set up routing
- [ ] Implement basic CRUD
- [ ] Build drag-and-drop
- [ ] Add photo upload
- [ ] Implement secrets
- [ ] Add search
- [ ] Build onboarding
- [ ] Package for distribution

---

## 🎯 Next Steps

**Immediate actions:**

1. **Make technology decisions** (Electron vs Tauri, shadcn vs Mantine)
2. **Set up repository** (GitHub, GitLab, etc.)
3. **Create project** with Vite
4. **Install dependencies** from package.json above
5. **Copy database schema** from DATABASE_SCHEMA_FINAL.md
6. **Build first page** (People List)

**Questions to discuss:**

1. Do you know Rust? (affects Electron vs Tauri choice)
2. What's your TypeScript experience?
3. Do you prefer Tailwind or CSS-in-JS?
4. What's your target launch date?
5. Which platforms to support first? (macOS, Windows, Linux)

---

**Ready to start coding?** Let me know which decisions you need help with! 🚀
