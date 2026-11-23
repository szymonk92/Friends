# 20 — Choosing NEW for an ambiguous name can abort extraction

**Status:** done
**Depends on:** none
**Priority:** P2 · **Effort:** S

## Goal
`hooks/useExtraction.ts:81-95`: if the forced-new name equals an existing name, `useCreatePerson` throws 'already exists'; extraction aborts half-way (some people created, story not marked processed). Not fully verified — depends on AI output.

## Tasks
- Allow duplicate names for AI-forced-new people (skip the uniqueness check there)

## Out of scope
—
