# HANDOFF

## Goal
Improve FriendZ (friends-mobile): fix audited bugs, improve the who-knows-whom network graph, make the UI visually consistent (fz design system). PR to `main`.

## Branch
`claude/graph-design-issues` — one commit per issue, PR open.

## Done (code-verified: `npm run ci` green, 364 tests)
- Bugs: 08 09 10 11 12 14 15 16 17 18 19 20 21 22 23 → `done`
- 04 tokens → `done`

## In progress — code done, needs a device look (R5CY141Z1DD)
- 05 06 & 01–03 verified on device → `done`
- 05 Paper theme mapped to fz (dialogs/cards/menus) · 06 PrimaryButton + shared AppBar · 07 BrainDumpSection
- 13 secrets: XChaCha20-Poly1305 done; password-mode KDF + allowBackup need a decision


## Next steps
1. Install a build on the phone, check: Network (pan/pinch/tap/double-tap, labels, suggestions), dialogs in Settings/Add story, Add/Edit person brain dump, secrets create/view
2. Set verified issues to `done` in `issues/*.md` + `issues/README.md`
3. #07 remaining screens one by one (settings sub-components, review-extractions, food-quiz, menu)

## Key paths
- Graph: `app/network.tsx`, `components/graph/*`, `lib/graph/{layout,suggestions}.ts` (+ tests)
- Tokens: `lib/design/tokens.ts`; Paper theme: `lib/theme.ts`; `components/{PrimaryButton,AppBar,Pill}.tsx`
- Secrets crypto: `lib/crypto/aead.ts`, `lib/crypto/biometric-secrets.ts`

## Gotchas
- QueryClient staleTime 5 min → wrong invalidation keys = visibly stale UI
- Soft deletes only; `useDeletePerson` now retires dependent rows itself
- Jest runs in Europe/Warsaw (`jest.globalSetup.js`); d3-* mapped to UMD, @noble compiled by ts-jest
- Release builds silence console.log/info/debug (`app/_layout.tsx`)
- Never read screenshots; user verifies visuals on device
