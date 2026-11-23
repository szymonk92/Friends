# 19 — Home birthday badge: duplicated logic, leap-day bug, untranslated

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
`app/(tabs)/index.tsx:25-33,370` re-implements `getDaysUntilBirthday` without Feb 29 handling; 'Today!' and '${days}d' hardcoded English.

## Tasks
- Reuse `getDaysUntilBirthday` from `lib/notifications/birthday-reminders.ts`; add i18n keys (en + pl)

## Out of scope
—
