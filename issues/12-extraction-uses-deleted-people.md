# 12 — AI extraction & review queue include deleted people/stories

**Status:** done
**Depends on:** none
**Priority:** P1 · **Effort:** S

## Goal
`hooks/useExtraction.ts:61` builds AI people context with only `userId` filter → a new story about 'Anna' links to a deleted Anna. `hooks/usePendingExtractions.ts` lists extractions of deleted stories/people; approving creates relations on a deleted person.

## Tasks
- Use `activePeople(userId)` (as `useAIExtraction.ts:52`)
- Filter pending extractions to non-deleted stories and people

## Out of scope
—
