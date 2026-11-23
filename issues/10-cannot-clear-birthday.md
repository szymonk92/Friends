# 10 — Birthday / date precision can't be cleared from edit form

**Status:** todo
**Depends on:** none
**Priority:** P1 · **Effort:** S

## Goal
`app/person/edit.tsx:179-180` uses `parseFlexibleDate(v) || undefined`; Drizzle skips `undefined`, so emptying the field keeps the old birthday.

## Tasks
- Use `?? null` for dateOfBirth and its precision

## Out of scope
—
