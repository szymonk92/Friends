# 23 — Small UX bugs: search story result, timeline multi-person edit

**Status:** todo
**Depends on:** none
**Priority:** P3 · **Effort:** S

## Goal
`app/(tabs)/search.tsx:183` story result navigates to `/stories` instead of `/story/${id}`. `app/(tabs)/timeline.tsx:197` editing an event with several people keeps only the first.

## Tasks
- Fix route
- Preserve all selected people on edit (or disable multi-select in edit mode)

## Out of scope
—
