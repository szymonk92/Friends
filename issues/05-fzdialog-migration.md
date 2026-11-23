# 05 — Migrate Paper `Dialog` to `FzDialog`

**Status:** todo
**Depends on:** none
**Priority:** P2 · **Effort:** M

## Goal
13 files use Paper `Dialog` with a hand-copied `dialogFont` (13 copies, ~80 refs). `FzDialog` exists but has 2 users.

## Tasks
Migrate: settings (3 near-identical API-key dialogs → one parameterised), review-extractions, import-contacts, story/addStory, PersonGiftIdeas, PersonImportantDates, PersonQuickActions, PersonTags, CreateSecretDialog, PasswordPromptDialog, ViewSecretDialog, SecretsSetup, AmbiguityResolutionDialog (also its `List.Item` ×3).

## Out of scope
Changing dialog behaviour/content.
