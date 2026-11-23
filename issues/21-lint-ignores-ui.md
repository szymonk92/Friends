# 21 — ESLint ignores app/, components/, hooks/, store/

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** M

## Goal
`eslint.config.js:19-22` ignores all UI code and has no react-hooks plugin, so `npm run lint` passing says nothing about screens.

## Tasks
- Lint all source, add `eslint-plugin-react-hooks`
- Fix or explicitly baseline what it reports

## Out of scope
Style-only rules.

## Result
- UI dirs linted with `react-hooks/rules-of-hooks` (error) + `exhaustive-deps` (warn, max-warnings 0) + no-unused-vars (`caughtErrors: 'none'`)
- 0 rules-of-hooks violations. Fixed 33 unused vars/imports and 10 dep warnings (`t` added to memos → labels now update on language change; mount-only effects marked explicitly)
- Real bug found via unused var: approving a pending extraction ignored its own duplicate check (`hooks/usePendingExtractions.ts`) → now reuses the existing relation
- Dead `useConnections` query removed from Search (no connection results were ever built)
