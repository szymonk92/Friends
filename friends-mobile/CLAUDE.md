# Project: FriendZ Mobile

AI-powered social memory manager — tracks people, relationships, stories, and preferences with local-first SQLite storage and AI extraction.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript 5.9 (strict) |
| UI | React Native Paper 5 (Material Design 3) |
| Navigation | Expo Router 6 (file-based) |
| Database | expo-sqlite 16 + Drizzle ORM 0.44 |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Forms | React Hook Form 7 + Zod 3 |
| AI | Anthropic Claude SDK + Google Gemini SDK |
| Testing | Jest 30 + React Native Testing Library 13 |
| i18n | i18next 25 + react-i18next 16 |

---

## Project Structure

```
friends-mobile/
├── app/              # Expo Router screens
│   ├── (tabs)/       # Main tab navigation
│   ├── person/[id].tsx
│   └── _layout.tsx
├── components/       # Reusable React Native components
├── hooks/            # TanStack Query hooks
├── lib/
│   ├── db/           # Drizzle schema + DB instance + CRUD
│   ├── ai/           # AI extraction service + prompts
│   ├── validation/   # Zod schemas
│   └── utils/        # Helper functions
├── store/            # Zustand stores
├── constants/        # Theme, relation types, colors
└── assets/           # Fonts, images
```

---

## Commands

```bash
npm run start          # Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (zero warnings)
npm run test           # Jest with coverage
npm run ci             # typecheck + lint + test (pre-commit)
npm run db:generate    # Generate Drizzle migration
npm run db:migrate     # Apply migrations
```

---

## Agents

### Project Agent
Use `@friendz` for all FriendZ-specific work — it has full codebase context.
→ Defined in `.github/agents/friendz.agent.md`

### Global Agents (for specialized domains)

| Task | Agent |
|------|-------|
| React Native / Expo UI | `@react-native` |
| Database / Drizzle migrations | `@database` |
| Tests (Jest, RNTL) | `@testing` |
| Security / encryption | `@security` |
| Performance optimization | `@performance` |
| Code review | `@reviewer` |
| AI/ML features | `@ai-ml` |
| Debugging errors | `@debugging` |
| Android device testing | `@android-device-debug` |
| E2E mobile tests | `@detox-e2e` |

---

## Project-Specific Rules

### Code
- Function components only — no class components
- TanStack Query for DB/server state; Zustand for UI-only state
- Drizzle ORM for all DB operations — no raw SQL
- Zod validation at all user-input boundaries
- No `any` — use `unknown` with type narrowing

### AI
- Default extraction model: `gemini-2.5-flash-lite` (cost-effective)
- Complex reasoning: `claude-3-5-sonnet-*`
- Never hardcode model names in call sites — use constants from `lib/ai/ai-service.ts`

### Security
- API keys and secrets via `expo-secure-store` only — never in source
- No sensitive data in logs or error messages

### i18n
- All user-visible strings use i18n keys: `t('namespace.key')`
- No hardcoded English strings in components

### Quality Gates (zero tolerance)
- `npm run typecheck` must pass — no suppression with `@ts-ignore`
- `npm run lint` must pass — max-warnings = 0
- `npm run test` must pass — fix failures, don't skip

---

## Database

- **Schema**: `lib/db/schema.ts` — 15 tables
- **Instance**: `lib/db/index.ts` — singleton, never import `expo-sqlite` in components
- **Migrations**: generated via `drizzle-kit`, stored in `drizzle/` directory

**Tables (auth):** `users`, `magic_link_tokens`, `sessions`  
**Tables (core):** `people`, `connections`, `relations`, `stories`, `secrets`, `contact_events`, `relationship_history`, `events`, `files`, `pending_extractions`  
**Tables (app state):** `quiz_dismissals`, `reminders`
