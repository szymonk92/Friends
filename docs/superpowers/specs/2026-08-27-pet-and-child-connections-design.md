# Pets & children as connections — design

**Date:** 2026-08-27
**Status:** approved for planning
**Scope:** let a user add a pet or a child from a person's Connections section without
creating a full-blown person record.

---

## Problem

The Connections section links two `people` rows. `connections.relationshipType`
already covers `parent` / `child` / `sibling` / `family`, and the add-connection
form already has a "Create new person and connect" path.

Gaps:

- **Pets** have no representation at all. Faking a person gives them irrelevant
  fields (email, languages, "met date") and pollutes the People tabs, "keep
  close" counts, food quiz, and party mode.
- **Children** are technically possible today (create person → relationship =
  child) but the path is not discoverable and carries the same full-person
  baggage.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Whose kid/pet | Belongs to one person via a normal connection edge. A second parent/owner is added later from the pet/child's own Connections section. **No inline second-parent picker in v1.** |
| Pet storage | Lightweight `people` row flagged `entityType = 'pet'`. Reuses connections, photos, important dates, stories. |
| Kid storage | No new concept. Reuse `people` + `connections.relationshipType = 'child'`; just make the path discoverable and minimal. |

## Non-goals (v1)

- Inline "second parent / owner" picker at add time.
- Dedicated Pets tab or Pets filter chip.
- Pet-specific reminders (vet visits).
- `breed` / `weight` / structured species picker — species is free text; anything
  else goes in `notes`.

---

## 1. Schema

### `people` — two new nullable columns

```ts
entityType: text('entity_type', { enum: ['person', 'pet'] }).default('person'),
species: text('species'), // free text: "Dog", "Cat", "Parrot". null for people.
```

Reused as-is for pets: `name`, `photoId`, `dateOfBirth` (pet birthday via the
existing important-dates flow), `notes`, `userId`, soft-delete columns.

For a pet row: `entityType = 'pet'`, `personType = 'mentioned'`,
`relationshipType` (the people-table one) left `null`.

### `connections.relationshipType` — add `'pet'`

```ts
relationshipType: text('relationship_type', {
  enum: ['friend', 'family', 'colleague', 'partner', 'acquaintance',
         'parent', 'child', 'sibling', 'pet'],
}).notNull(),
```

Drizzle enums are compile-time only (no DB CHECK constraint), so this needs **no
migration** — schema.ts edit + type regen only.

### Migration

`npm run db:generate` produces one additive migration adding `entity_type`
(default `'person'`) and `species` (nullable) to `people`. Safe for existing
rows. Applied on app start by the existing `lib/db/migrate.ts` runner.

---

## 2. `hooks/usePeople.ts`

`usePeople(filter?)` currently accepts `{ type?: 'primary' | 'mentioned' | 'all' }`.

- Add `entityType?: 'person' | 'pet' | 'all'` to the filter object.
- **Default when omitted: `'person'`.** Append `eq(people.entityType, 'person')`
  to `whereConditions` unless the caller passes `entityType: 'pet'` or `'all'`.
- Bump the `queryKey` to include the entityType segment.

Effect: every current caller (`app/(tabs)/index.tsx`, search, counts, quizzes,
party mode, `PartnerBadge`) keeps working and silently excludes pets. Callers
that resolve a *connected* entity by id need the audit below.

### Caller audit

`PersonConnections.tsx` and `PartnerBadge.tsx` use `usePeople()` to resolve a
connected person by id. With the new default they will not find pet rows. Fix:
give `PersonConnections` `usePeople({ entityType: 'all' })` for its lookup map
only (it already filters to real connections; showing a pet row there is the
goal). `PartnerBadge` stays default (`person`) — a pet is never a partner.

---

## 3. Add flow — `app/person/connection-form.tsx`

In the **"Create new person and connect"** branch, add a 3-way segmented control
above the name field:

```
[ Person ]  [ Pet ]  [ Child ]
```

State: `newEntityKind: 'person' | 'pet' | 'child'` (default `'person'`).

| Kind | Form differences | On save |
|------|------------------|---------|
| Person | unchanged (primary/mentioned pills, etc.) | unchanged |
| Pet | hide primary/mentioned pills; show **Species** text input (required) and keep the optional **Birthday** field | create person `{ entityType: 'pet', personType: 'mentioned', species, dateOfBirth? }`; connection `{ relationshipType: 'pet' }` |
| Child | hide primary/mentioned pills; show optional **Birthday** field | create person `{ entityType: 'person', personType: 'mentioned', dateOfBirth? }`; connection `{ relationshipType: 'child' }` |

- The relationship-type pill row is **hidden** for Pet and Child (it's implied).
- Qualifier + Notes inputs stay available for all three.
- Birthday writes `people.dateOfBirth` directly on create. (Surfacing it as an
  important-date event is out of scope; the column is enough for v1.)
- Existing multi-select "add connection to several existing people" path is
  unaffected — the segmented control only shows when creating a new entity.

---

## 4. Display

### `components/person/PersonConnections.tsx`

- Use `usePeople({ entityType: 'all' })` for the id→person lookup map.
- Per row, branch on the connected entity:
  - `entityType === 'pet'` → description line = `🐾 {species}` (fall back to
    `Pet` if species missing); status pill hidden.
  - `connection.relationshipType === 'child'` → description line prefixed with a
    child glyph, e.g. `Child · {qualifier?}`.
  - else → unchanged `relationshipType • qualifier • status`.
- Notes line (added earlier this session) unchanged.
- Tapping a pet row still routes to `/person/{petId}` — see next.

### `components/person/PersonHeader.tsx` (viewing a pet's own profile)

When `person.entityType === 'pet'`:

- Chip row → a single species chip (`🐾 Dog`); skip relationshipType /
  personType / importance / homeLocation chips.
- Hide the "Met" line, `ContactQuickRow`, `SocialLinksStrip`, languages row.
- Keep: avatar (+ camera badge), name, nickname, notes, PartnerBadge stays
  hidden (no partner connection type resolves), important-dates section still
  works for the birthday.

This is a conditional inside the existing component, not a new screen.

### `app/person/[id].tsx`

No structural change. The ⋮ menu's "Add Relation" / "View Relationship" /
"Compare With…" items should be **hidden when `person.entityType === 'pet'`**
(same `personType !== 'self'` guard pattern, extended).

---

## 5. Entry points

The add-connection screen's segmented Person/Pet/Child control (§3) is the
primary entry point; the Connections section `+` already routes there.

Optionally add "Add pet" and "Add child" items to the Connections section's ⋮
menu that deep-link to the add screen with the kind preselected via a query
param (`?newKind=pet`). Nice-to-have, can be cut if the segmented control reads
clearly enough.

---

## Files touched

| File | Change |
|------|--------|
| `lib/db/schema.ts` | `people.entityType`, `people.species`; `connections.relationshipType` += `'pet'` |
| `lib/db/migrations/*` | generated additive migration (2 columns) |
| `hooks/usePeople.ts` | `entityType` filter, default `'person'`, queryKey |
| `app/person/connection-form.tsx` | Person/Pet/Child segmented control + species/birthday fields + save branching |
| `components/person/PersonConnections.tsx` | `entityType: 'all'` lookup; pet/child row rendering |
| `components/person/PersonHeader.tsx` | pet-profile conditional layout |
| `app/person/[id].tsx` | hide relation menu items for pets |
| `lib/validation/schemas.ts` | if a person/connection zod schema exists, extend with `entityType` / `species` / `'pet'` |

## Testing

- Unit: `usePeople` default excludes `entityType='pet'`; `entityType:'all'`
  includes them.
- Migration: fresh DB + existing-DB upgrade both boot; existing people read back
  `entityType === 'person'`.
- Manual on device: add a pet from a person's Connections → appears as `🐾 Dog`
  row → tap → minimal pet profile → add birthday → shows in important dates.
  Add a child → appears as child row. Confirm People tabs / counts unchanged.
- `npm run ci` (typecheck + lint + jest) green.
