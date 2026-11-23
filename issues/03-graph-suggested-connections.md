# 03 — Graph: suggest connections from shared stories

**Status:** todo
**Depends on:** 01
**Priority:** P3 · **Effort:** M

## Goal
Most users won't enter connections by hand, so the graph stays sparse. People mentioned together in the same story very likely know each other.

## Tasks
- Query pairs of people co-mentioned in ≥1 story that have no `connections` row.
- Show them as faint dotted "suggested" edges (toggle) and as "Do X and Y know each other?" suggestions with one-tap accept (creates `acquaintance` connection).
- Quick add from graph: long-press node A, tap node B → connection form prefilled.

## Out of scope
AI inference of relationship type.

## Open questions
Is a single co-mention enough, or require ≥2?
