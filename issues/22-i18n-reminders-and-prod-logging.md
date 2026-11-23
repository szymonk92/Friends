# 22 — Reminder text hardcoded English; debug logging in production

**Status:** done
**Depends on:** none
**Priority:** P3 · **Effort:** S

## Goal
`hooks/useReminders.ts:184-185` notification text not translated. Debug logs in `lib/ai/ai-service.ts:578`, `lib/notifications/birthday-reminders.ts:189,197` run in release (useConnections logs already removed in #01).

## Tasks
- `tr()` keys (en + pl)
- Gate logs with `__DEV__`

## Out of scope
—
