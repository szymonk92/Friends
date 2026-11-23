# 21 — ESLint ignores app/, components/, hooks/, store/

**Status:** todo
**Depends on:** none
**Priority:** P2 · **Effort:** M

## Goal
`eslint.config.js:19-22` ignores all UI code and has no react-hooks plugin, so `npm run lint` passing says nothing about screens.

## Tasks
- Lint all source, add `eslint-plugin-react-hooks`
- Fix or explicitly baseline what it reports

## Out of scope
Style-only rules.
