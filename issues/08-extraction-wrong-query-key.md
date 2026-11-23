# 08 — AI extraction invalidates wrong query key → stale conflicts, duplicate relations

**Status:** done
**Depends on:** none
**Priority:** P1 · **Effort:** S

## Goal
`hooks/useAIExtraction.ts:110,334,383` invalidate `['pendingExtractions']`; the real key is `['pending-extractions']`. Resolving a conflict (Accept new / Keep both) leaves the card visible up to 5 min (staleTime); tapping again inserts a duplicate relation. `['story-extractions', id]` is never invalidated.

## Tasks
- Use `['pending-extractions']`, also invalidate `['story-extractions']`
- Guard mutations: only act when `reviewStatus === 'pending'`

## Out of scope
Reworking the review flow.
