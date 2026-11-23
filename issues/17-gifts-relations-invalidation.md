# 17 — Gifts and Relations sections go out of sync

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
Gifts are WANTS relations shown in two sections. `hooks/useGifts.ts:107,158,174` invalidate only `['gifts']`; relation mutations don't invalidate gifts.

## Tasks
- Gift mutations invalidate `['relations']`; relation update/delete invalidate `['gifts']`

## Out of scope
—
