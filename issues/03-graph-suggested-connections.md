# 03 — Graph: suggest connections from shared stories

**Status:** done
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

## Progress
- [x] Root cause: stories never recorded their people (`stories.peopleIds` unused). Both extraction paths now save the resolved person ids; older stories fall back to known ids in `extractedData`
- [x] `lib/graph/suggestions.ts` (+ tests): co-mentioned pairs without a connection, ranked by shared stories, deleted people excluded
- [x] Network screen: "Might know each other" card (top 5, hidden while a person is selected) with one-tap Connect → `acquaintance` connection (en + pl strings)
- [ ] (later) Dotted suggested edges in the graph / long-press A → B quick connect (later, if the list proves useful)
- [x] Verified on device R5CY141Z1DD
