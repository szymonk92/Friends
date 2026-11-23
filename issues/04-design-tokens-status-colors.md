# 04 — Design tokens: onInk, danger, warn; remove remaining hex literals

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
Every colour comes from `lib/design/tokens.ts`.

## Tasks
- [x] `#6200ee` (review-extractions), `#2e78b7` (+not-found), `#f5f5f5` backgrounds (settings, review-extractions, addStory) → tokens
- [x] `'#1B1815'` defaults in LineIcon / ChainLogo / RelationIcon → `fz.ink`
- [x] Deleted unused `styles/common.ts`, `styles/spacing.ts` (no imports)
- [x] Add `fz.onInk` (#FFF, ~12 `'#fff'` uses), `fz.danger` (#D32F2F), `fz.warn`/`fz.warnBg` (#E65100/#FFF3E0), `fz.textChipOutline` (#6B655B in Pill)
- [x] Replace in: addStory, NoteCards, SecretsSetup, QuizControls (danger); (tabs)/index, import-contacts `#C77700`, review-extractions, SecretsSetup (warn); PhotoBrowser `#4caf50`; ViewSecretDialog `#ff5722`; review-extractions confidence colours

## Out of scope
Dark mode.
