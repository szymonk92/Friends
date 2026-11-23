# 01 — Network graph: layout, readability, who-knows-whom

**Status:** done
**Depends on:** none
**Priority:** P1 · **Effort:** M

## Goal
Make the "who knows whom" graph (`app/network.tsx`) readable at a glance and useful for exploring connections.

## Tasks
- [x] Pure, tested layout `lib/graph/layout.ts` (sync 300 ticks instead of ~300 React re-renders per load)
- [x] forceX/forceY instead of forceCenter → people with no connections no longer drift off-screen
- [x] Auto fit-to-view on load / filter change; double-tap refits (was reset to 0,0,1)
- [x] First names always visible under nodes (previously no labels until a node was tapped); full name when selected
- [x] Initials centred (measured; were hardcoded `x=-8`) and 2-letter initials from first+last name
- [x] Edge width by `connections.strength`; dashed edges for ended/inactive/ex-partner
- [x] Pinch zooms around the fingers (was around origin → graph jumped away)
- [x] Selected + neighbours drawn on top; others dimmed
- [x] Details card lists the people the selected person knows (with relation label, tap → select them) + "Open profile"
- [x] Fix: filter/search with 0 matches kept showing the previous graph → now "No results"
- [x] Removed debug `console.warn` on every pinch frame + `[FDG] mount`, and `useConnections` debug logs
- [x] Verified on device R5CY141Z1DD

## Out of scope
Colour-coding by relationship type (design is B&W for now).

## Open questions
- Hide name labels below a zoom threshold if large graphs get cluttered?
