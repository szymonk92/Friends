# 14 — Deleting a person leaves connections, events, reminders visible

**Status:** todo
**Depends on:** none
**Priority:** P2 · **Effort:** M

## Goal
Soft delete only invalidates people/relations; SQLite FK cascade never fires (soft delete, no `PRAGMA foreign_keys`). Timeline shows 'Unknown' events, PersonConnections counts deleted links, reminders still fire, `usePerson` opens deleted profiles via old links.

## Tasks
- In `useDeletePerson`: soft-delete connections, contact events, reminders, pending extractions in one transaction; invalidate their keys
- `usePerson`: filter `isNull(deletedAt)`
- Filter deleted people in `useConnections`

## Out of scope
Undo/restore.
