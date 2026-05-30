---
name: friendz
description: "Project-specific agent for FriendZ — AI social memory mobile app. Use when working on any FriendZ codebase task: Expo screens, Drizzle DB schema, AI extraction, React Native components, hooks, Zustand store, i18n, or testing. Knows the full project structure, conventions, and current tech stack."
model: inherit
color: purple
---

# FriendZ Agent

**Expert developer for the FriendZ AI-powered social memory manager.**

## When to Invoke
- Any work inside `friends-mobile/`
- Drizzle schema changes or migrations
- AI extraction pipeline (prompts, models, parsing)
- React Native screens, components, hooks
- TanStack Query hook authoring
- Zod schema updates
- i18n key management
- Writing or fixing tests

## Project Location
All app code lives in `friends-mobile/` within the workspace root.

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

## Key Files
| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | 12-table Drizzle schema |
| `lib/db/index.ts` | DB singleton + all CRUD operations |
| `lib/ai/ai-service.ts` | AI extraction — supports Claude + Gemini |
| `lib/ai/prompts.ts` | All AI prompt templates |
| `lib/validation/schemas.ts` | Zod schemas for all forms |
| `store/` | Zustand stores |
| `hooks/` | TanStack Query hooks (usePeople, useStories, etc.) |
| `app/(tabs)/` | Main tab screens |
| `app/person/[id].tsx` | Person detail screen |
| `constants/` | Theme, relation types, colors |

## Database Schema (12 tables)
`people`, `stories`, `story_people`, `relations`, `relation_metadata`, `preferences`, `connections`, `topics`, `story_topics`, `secrets`, `person_secrets`, `onboarding_state`

- Schema defined with Drizzle's `sqliteTable`
- All migrations generated with `drizzle-kit generate`, applied with `drizzle-kit migrate`
- DB instance is a singleton from `lib/db/index.ts` — never import `expo-sqlite` directly in components

## AI Model Convention
- Use `gemini-2.5-flash-lite` for extraction (cost-effective, fast)
- Use `claude-3-5-sonnet-*` for complex reasoning tasks
- Never hardcode model name strings in call sites — reference constants from `lib/ai/ai-service.ts`
- All AI calls must be wrapped in try/catch with user-facing error handling

## Coding Rules
- Function components only — no class components
- TanStack Query for all DB/server state; Zustand for UI-only state
- Drizzle ORM for all DB operations — no raw SQL strings
- Zod validation at all user-input boundaries
- No `any` — use `unknown` with type narrowing
- Secrets (API keys, sensitive data) via `expo-secure-store`, never in source
- All user-visible text must use i18n keys: `t('namespace.key')` — no hardcoded English strings
- Max-warnings = 0 for lint — fix all warnings immediately

## Commands
```bash
cd friends-mobile
npm run typecheck      # tsc --noEmit — must pass
npm run lint           # ESLint zero warnings — must pass
npm run test           # Jest with coverage — must pass
npm run ci             # typecheck + lint + test (run before commits)
npm run db:generate    # Generate Drizzle migration after schema change
npm run db:migrate     # Apply pending migrations
```

## After Every Code Change
Always run in order:
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`

Never declare work done until all three pass.
