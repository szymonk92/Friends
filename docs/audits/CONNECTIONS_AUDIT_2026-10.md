# Connections (person ↔ person) audit — 2026-10

Audited SHA: `5b9a552e60e2f45c979fd11d5a2b3e24cef85c6c` (branch `fix/fz-dialogs-and-notes-padding`).
Paths below are relative to `friends-mobile/`.

Baseline: `npx jest` → 20 suites, 302 tests, all pass.
Threat model: a local-first, single-user SQLite app. There is no server and no second
tenant on the device, so the findings are about correctness and data integrity, not access control.

| ID | Sev | Title | Evidence | Confidence | Status |
|---|---|---|---|---|---|
| CN-01 | Medium | "Create '<name>'" reuses an existing person with no duplicate check, so it can create self-links and duplicate pairs | `app/person/connection-form.tsx:379`, `:913` | READ (+ DB accepts it, REPRODUCED) | open |
| CN-02 | Medium | Links to **Me** or to a deleted person are counted but not shown, so they can't be edited or deleted from that profile | `components/person/PersonConnections.tsx:31,59`, `hooks/usePeople.ts:50` | REPRODUCED | open |
| CN-03 | Medium | Brain-dump partner swap ends the old partner link, then throws when the new partner's name already exists. The new link and every accepted attribute are lost | `app/person/edit.tsx:109-137`, `hooks/usePeople.ts:158` | READ | open |
| CN-04 | Low | Delete-connection confirm names the wrong person | `app/person/connection-form.tsx:51,567` | READ | open |

## CN-01: "Create" path skips the duplicate check and can link a person to themselves

- **Trigger:** On Alice's profile, open *Add connection* and type `Alice` (or `Bob`, who is already Alice's friend). The **Create "…"** button shows for any non-empty query (`:913`). Tap it, keep the type as friend, then save.
- **Path:** `pendingPersonName` is set and `targetPersonId` is null, so the duplicate check at `:346-363` is skipped (`if (targetPersonId)`). Then `:379` runs `everyone.find(name match)`. `everyone` comes from `usePeople({entityType:'all'})`, and it includes the subject (only `availablePeople` filters the subject out, `:188`). It resolves to Alice or Bob, and `createConnection` inserts `alice→alice`, or a second `alice→bob friend` row.
- **Wrong outcome:** Alice's profile lists "Alice · friend", or Bob twice. The network graph gets a self-loop or a double edge, and the export carries the duplicate.
- **Why defences miss it:** The UI check only runs when a list row was tapped. The DB has no `CHECK (person1_id != person2_id)` and no unique index on the pair. Repro against the shipped DDL:
  ```
  # extract CREATE TABLE connections from lib/db/index.ts, then:
  INSERT … ('c1','u','alice','alice','friend',0,0);   -- accepted
  INSERT … ('c2','u','alice','bob','friend',0,0);     -- accepted
  INSERT … ('c3','u','bob','alice','friend',0,0);     -- accepted
  ```
  (script: `$CLAUDE_JOB_DIR/tmp/conn.sql`, run with `sqlite3 :memory: < conn.sql`)
- **Fix:** After resolving `existing` at `:379`, reject `existing.id === personId` and run the same duplicate predicate as `:348` (pull it into one helper that all three call sites use). Add `CHECK (person1_id <> person2_id)` in the migration.
- **Note:** TASKS.md's original design had `no_self_connection`. It was never carried into `lib/db/index.ts`.

## CN-02: Links to Me or to deleted people are counted but never rendered

- **Trigger A (Me):** On Alice's profile, add a connection and pick **Me**. The picker includes `mePerson`, `connection-form.tsx` `allPeople`. The same happens when the link is created from Me's profile.
- **Trigger B (deleted):** Link Alice to Bob, then delete Bob. `useDeletePerson` only sets `people.deletedAt`.
- **Path:** `usePersonConnections('alice')` returns the row. `PersonConnections` resolves the other side through `usePeople`, which always applies `ne(personType,'self')` (`hooks/usePeople.ts:50`) and `activePeople` (not deleted). `getConnectedPerson` returns `undefined`, so `:59` returns `null`, but `:31` still shows `count={personConnections.length}`. `manage-connections.tsx:61` drops the row the same way, and `network.tsx:61` drops the edge.
- **Wrong outcome:** The header reads "Connections 2" with zero rows and no empty state. The only edit/delete entry points for those links are on these screens, so they can't be edited or deleted from Alice's side. A link to Me never shows on any friend's profile.
- **Repro (REPRODUCED):** a throwaway test in a detached worktree at the audited SHA, `components/person/__tests__/auditConnections-test.tsx`. It mocks the two hooks and calls the component as a function:
  ```
  cd $CLAUDE_JOB_DIR/tmp/wt/friends-mobile
  npx jest components/person/__tests__/auditConnections-test.tsx --coverage=false
  → REPRO count=2 rows=0 emptyState=false   (expect(rows).toBe(count) fails: 0 vs 2)
  ```
- **Fix:** In both screens, resolve against `[...people, mePerson]`, and derive `count` from the resolved list. Filter out connections whose other side is deleted in `usePersonConnections` (join `people`, `deletedAt IS NULL`), or cascade `deletedAt` per SYSTEM_AUDIT D3.
- **Known overlap:** SYSTEM_AUDIT D3 covers inert FKs and soft-delete not cascading, for relations. The visible connection symptom and the Me case are new.

## CN-03: Brain-dump partner swap is a partial write when the partner already exists

- **Trigger:** Alice's active partner is Bob, and Carol is already a person in the app. In *Edit Alice* → brain dump, write "Alice is dating Carol now" and accept the partner chip. `classifyPartner` (`lib/ai/brain-dump-diff.ts:149-165`) returns UPDATE and never checks existing people.
- **Path:** `edit.tsx:109` sets Bob's link to `status:'ended', endReason:'breakup'`. Then `:119` `createPerson({name:'Carol'})` throws `A person named "Carol" already exists` (`hooks/usePeople.ts:156-158`). The catch at `:151` shows an alert, so `:128` (the Carol link) and `:137` (all accepted attribute chips) never run.
- **Wrong outcome:** Alice ends up with no partner, Bob is marked as a breakup, Carol isn't linked, and the user's other accepted brain-dump facts are silently dropped (the alert shows only the name error). The NEW case (no current partner) also fails for any existing name.
- **Why READ, not REPRODUCED:** the handler lives inside the screen component, and the project's jest config (ts-jest, `node` env) has no RN renderer. The full path is traced above.
- **Fix:** Resolve `partnerName` to an existing person (case-insensitive, as `connection-form.tsx:379` does), and create only when there's no match. Run the end-partner, create-link and attribute writes in one `db.transaction`, or move the partner end after a successful create. Relates to D4 (no transactions), but this trigger is deterministic, not a crash.

## CN-04: Delete confirm names the wrong person

- **Trigger:** Open a connection from a profile (`edit-connection?connectionId=…&fromPersonId=…`), then choose Delete.
- **Path:** In edit mode `personId` is `undefined` (`:51`), so `:567` always picks `person1Id`. That is usually the profile you came from.
- **Wrong outcome:** On Alice's profile: "delete the connection with **Alice**?". It deletes the right row, but the confirm names the wrong person.
- **Fix:** Use `fromPersonId` in place of `personId` at `:567` (as `editConnectedPerson` at `:177-183` already does).

## Leads not confirmed

- **Several active partners:** nothing stops `partner` links to both Bob and Carol, and `PersonForm.tsx:93` / PartnerBadge take the first one. Whether that's allowed is a product decision.
- **Stale `existingConnections`:** the duplicate check uses a query that may not have loaded yet when the user submits fast. Not timed.
- **Import (`hooks/useDataExport.ts:239-256`):** inserts connections with the original IDs and doesn't check that person IDs exist, so it can create orphans (FKs are off, D3). Not exercised.

## Checked and sound

- `usePersonConnections` / `useConnections` filter by `userId` and `deletedAt IS NULL`. Both directions are queried.
- Cache invalidation: the `['connections']` prefix invalidates every `['connections','person',id]` key (TanStack's default non-exact match), on create, update and delete.
- The duplicate check in list-tap single mode and multi-select covers both directions plus the pet type override (`:348`, `:475`, `:501`).
- `describeConnection` flips child/parent by viewer, and pet links are decided by entity type.
- Obsidian export skips connections whose other side isn't exported (`obsidianTemplates.ts:100-101`).
- SQL injection: everything goes through Drizzle query builders, with no string-built SQL in this area.
- Update/delete without a `userId` filter: n/a, since there is one user per device DB and no tenant boundary.

## Not covered

- Known before this audit: asymmetric qualifiers ("Daughter" shown from both sides, `docs/CONNECTIONS.md`), inert FKs and soft-delete cascades (SYSTEM_AUDIT D3), and missing transactions (D4).
- AI story-extraction paths that may create connections indirectly (`lib/ai/ai-service.ts`, `prompts.ts`).
- Party planner seating and search-tab use of connections. These are read-only consumers.
- `app/dev.tsx` / `clearAllData` (dev tooling, though `menu.tsx:144` exposes it without a `__DEV__` gate, which is a separate lead).
- No on-device run. All evidence is code reading, the SQLite CLI and jest.
