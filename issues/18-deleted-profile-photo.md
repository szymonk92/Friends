# 18 — Deleting current profile photo leaves a broken avatar

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
`hooks/usePhotos.ts:157-188` deletes the file but `people.photoId` still points to it; lookup in `hooks/usePeople.ts:84` doesn't filter deleted files; `['people']` not invalidated.

## Tasks
- Null `people.photoId` when it matches, filter `isNull(files.deletedAt)`, invalidate `['people']`

## Out of scope
—
