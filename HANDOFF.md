# HANDOFF

## Goal
Improve FriendZ (friends-mobile): fix audited bugs, improve the who-knows-whom network graph, make the UI visually consistent (fz design system). Fix issues one by one, then open a PR to `main`.

## Branch
`claude/graph-design-issues` (from origin/main). One commit per issue.

## Done
- #01 graph rewrite (device check pending) · #04 tokens
- Issues 01–23 written; index `issues/README.md` (regenerate: `$CLAUDE_JOB_DIR/tmp/index.sh`, or edit by hand)

## In progress
Sweep order: 08 → 09 → 10 → 11 → 12 → 14 → 15 → 17 → 18 → 19 → 20 → 23 → 22 → 16 → 21 → 05 → 06 → 07.
Not in this PR: 02 (needs device), 03 (feature), 13 (needs native crypto lib + migration decision).

## Next steps
After each issue: `cd friends-mobile && npx tsc --noEmit && npm run lint && npx jest`, set issue Status, update index, commit.

## Key paths
- Graph: `app/network.tsx`, `components/graph/*`, `lib/graph/layout.ts` (+ test)
- Tokens: `lib/design/tokens.ts`; shared UI: `components/{Pill,IconCircle,AppBar,FzDialog,Avatar}.tsx`
- Dates: `lib/utils/dates.ts` (`toDateText`, `toFlexibleText`, `parseFlexibleDate`)

## Gotchas
- QueryClient staleTime 5 min → wrong invalidation keys = visibly stale UI
- All deletes are soft; FK cascades never fire
- ESLint ignores app/components/hooks/store (#21) — lint passing ≠ UI checked
- Jest maps d3-* to UMD builds (ESM-only packages)
- Never read screenshots; user verifies visuals on device
