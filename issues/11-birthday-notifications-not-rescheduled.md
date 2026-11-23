# 11 — Birthday notifications not rescheduled on edit/delete

**Status:** todo
**Depends on:** 10
**Priority:** P1 · **Effort:** S

## Goal
Yearly birthday notifications are rescheduled only from PersonImportantDates toggle/edit. Deleting a person (`hooks/usePeople.ts:213`), deleting a birthday (`PersonImportantDates.tsx:97`) or editing it in `app/person/edit.tsx:173` leaves the old notification firing forever.

## Tasks
- Call `scheduleBirthdayReminders()` on success of delete person / update person / delete birthday

## Out of scope
Per-person notification diffing.
