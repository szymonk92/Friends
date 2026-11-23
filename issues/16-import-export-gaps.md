# 16 — Import: no UI refresh, orphan ids; export misses events, CSV escaping

**Status:** todo
**Depends on:** 09
**Priority:** P2 · **Effort:** M

## Goal
`hooks/useDataExport.ts:166-307`: no invalidation after import; skipped (duplicate-name) people keep export ids in relations/connections → orphans. Events/photos/reminders not exported. `:362` unguarded `JSON.parse(p.tags)`, `"` in names not escaped in CSV.

## Tasks
- Invalidate all queries on import success
- Remap skipped ids to existing person ids
- Safe tags parse, proper CSV quoting
- (later) export/import `events`

## Out of scope
Photos in export.
