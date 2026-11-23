# 05 — Migrate Paper `Dialog` to `FzDialog`

**Status:** in-progress
**Depends on:** none
**Priority:** P2 · **Effort:** M

## Goal
13 files use Paper `Dialog` with a hand-copied `dialogFont` (13 copies, ~80 refs). `FzDialog` exists but has 2 users.

## Tasks
Migrate: settings (3 near-identical API-key dialogs → one parameterised), review-extractions, import-contacts, story/addStory, PersonGiftIdeas, PersonImportantDates, PersonQuickActions, PersonTags, CreateSecretDialog, PasswordPromptDialog, ViewSecretDialog, SecretsSetup, AmbiguityResolutionDialog (also its `List.Item` ×3).

## Out of scope
Changing dialog behaviour/content.

## Result (approach changed)
`FzDialog` is alert-only (title/message/buttons); most of these dialogs hold forms, so a 1:1 swap would mean building a second dialog system. Instead:
- [x] Paper theme (`lib/theme.ts`) mapped to fz: `elevation.level1-5` → `fz.card` (dialogs/cards/menus were MD3 grey #e8e8e8/#f5f5f5), `onSurface` → ink, `onSurfaceVariant` → textBody, `outline`/`outlineVariant` → fz outline/hairline, error/warning → fz.danger/warn. Restyles every remaining Paper Dialog/Card/Menu/List at once.
- [x] Deleted all 13 `dialogFont` copies (theme already sets Space Grotesk)
- [x] Settings: 3 API-key dialogs + 6 handlers → one table-driven dialog (305 → 195 lines)
- [ ] Verify on device (dialogs in settings, addStory, gifts, tags, important dates, secrets, import contacts)
