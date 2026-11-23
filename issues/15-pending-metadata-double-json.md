# 15 — Pending extraction metadata JSON-encoded twice

**Status:** todo
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
`hooks/useExtraction.ts:177` stringifies `rel.metadata` which is already a string → stored as `"\"{...}\""`; `metadataPrecision()` returns null so year-only dates show as exact Jan 1.

## Tasks
- `metadata: rel.metadata ?? null`
- Tolerate already double-encoded rows when reading

## Out of scope
—
