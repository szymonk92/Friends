# 16 — Import: no UI refresh, orphan ids; export misses events, CSV escaping

**Status:** done
**Depends on:** 09
**Priority:** P2 · **Effort:** M

## Goal
`hooks/useDataExport.ts:166-307`: no invalidation after import; skipped (duplicate-name) people keep export ids in relations/connections → orphans. Events/photos/reminders not exported. `:362` unguarded `JSON.parse(p.tags)`, `"` in names not escaped in CSV.

## Tasks
- [x] Invalidate all queries on import success (+ reschedule birthdays)
- [x] Remap skipped ids to existing person ids; drop photoId (photos not exported)
- [x] Safe tags parse, CSV quoting for every cell

## Out of scope
Photos, parties (`events`) and reminders in export/import — feature gap, open a new issue if wanted.
