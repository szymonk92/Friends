# Pets & Children as Connections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add a pet or a child from a person's Connections section without creating a full person record.

**Architecture:** A pet is a lightweight row in the existing `people` table, flagged `entity_type = 'pet'` with a free-text `species`. A child reuses `people` + the existing `connections.relationship_type = 'child'` — no new concept, just a discoverable path. `usePeople` gains an `entityType` filter that defaults to `'person'`, so pets never leak into People tabs, counts, quizzes, or party mode. Display is conditional rendering inside existing components; no new screens.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9 (strict), expo-sqlite + Drizzle ORM, TanStack Query, React Native Paper 5, Zod 3, Jest 30.

**Spec:** `docs/superpowers/specs/2026-08-27-pet-and-child-connections-design.md`

## Global Constraints

- Function components only — no class components.
- TanStack Query for DB/server state; Zustand for UI-only state.
- Drizzle ORM for all DB operations — no raw SQL in app code. (Runtime schema migrations live in `lib/db/index.ts` as guarded `ALTER TABLE` statements — that is the established pattern in this repo, not drizzle-kit journal migrations.)
- Zod validation at all user-input boundaries.
- No `any` — use `unknown` with type narrowing.
- All user-visible strings should use i18n keys where the surrounding code already does; match the local file's convention (the connection form currently uses literal English strings — follow that).
- Quality gates, zero tolerance: `npm run typecheck`, `npm run lint` (max-warnings 0), `npm run test` must all pass.
- Runtime DB column adds must be wrapped in `try { expoDb.execSync(...) } catch { /* column exists */ }` and mirrored into the `CREATE TABLE IF NOT EXISTS` block for fresh installs.
- Dates are entered as flexible text ("YYYY", "YYYY-MM", "YYYY-MM-DD") and parsed with `parseFlexibleDate` from `lib/utils/dates`. The app has no native date picker — do not add one.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `lib/db/schema.ts` | Drizzle table defs — add `entityType`/`species` to `people`, add `'pet'` to `connections.relationshipType` enum | 1 |
| `lib/db/index.ts` | Runtime table creation + guarded column migrations — add the two `people` columns | 1 |
| `lib/validation/schemas.ts` | Zod input-boundary schemas — `entityTypeEnum`, extend `newPersonSchema` | 1 |
| `lib/validation/__tests__/newPersonSchema.entity.test.ts` | Unit tests for the schema additions | 1 |
| `lib/people/entityFilter.ts` | **New.** Pure helper mapping an `EntityTypeFilter` to a SQL constraint value | 2 |
| `lib/people/__tests__/entityFilter.test.ts` | Unit tests for that helper | 2 |
| `hooks/usePeople.ts` | Wire the `entityType` filter into the `usePeople` query (default `'person'`) | 2 |
| `app/person/connection-form.tsx` | Person/Pet/Child segmented control + species/birthday fields + save branching | 3 |
| `components/person/PersonConnections.tsx` | Render pet rows (`🐾 species`) and child rows; use `entityType: 'all'` for the id→person lookup | 4 |
| `components/person/PersonHeader.tsx` | Minimal layout when viewing a pet's own profile | 5 |
| `app/person/[id].tsx` | Hide relation-related ⋮ menu items for pets | 5 |

---

## Task 1: Schema, DB columns, Zod validation

**Files:**
- Modify: `lib/db/schema.ts` (people table ~line 92; connections `relationshipType` enum ~line 176-178)
- Modify: `lib/db/index.ts` (`CREATE TABLE IF NOT EXISTS people` block ~line 69-105; add a new migration array after the `piiMigrations` loop ~line 157)
- Modify: `lib/validation/schemas.ts` (after `importanceEnum` ~line 16; inside `newPersonSchema` ~line 47)
- Test: `lib/validation/__tests__/newPersonSchema.entity.test.ts` (create)

**Interfaces:**
- Produces:
  - `people.entityType: 'person' | 'pet' | null` (Drizzle column, default `'person'`)
  - `people.species: string | null` (Drizzle column)
  - `connections.relationshipType` union now includes `'pet'`
  - `entityTypeEnum` — `z.ZodEnum<['person', 'pet']>` exported from `lib/validation/schemas.ts`
  - `newPersonSchema` parsed shape gains `entityType: 'person' | 'pet'` (default `'person'`) and `species?: string | null`

- [ ] **Step 1: Write the failing test**

Create `lib/validation/__tests__/newPersonSchema.entity.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { newPersonSchema, entityTypeEnum } from '../schemas';

describe('newPersonSchema — entity fields', () => {
  it('defaults entityType to "person" when omitted', () => {
    const parsed = newPersonSchema.parse({ name: 'Jane Doe' });
    expect(parsed.entityType).toBe('person');
  });

  it('accepts entityType "pet" with a species', () => {
    const parsed = newPersonSchema.parse({ name: 'Rex', entityType: 'pet', species: 'Dog' });
    expect(parsed.entityType).toBe('pet');
    expect(parsed.species).toBe('Dog');
  });

  it('rejects an unknown entityType', () => {
    expect(() => newPersonSchema.parse({ name: 'Rex', entityType: 'robot' as never })).toThrow();
  });

  it('rejects a species longer than 40 characters', () => {
    expect(() =>
      newPersonSchema.parse({ name: 'Rex', entityType: 'pet', species: 'x'.repeat(41) })
    ).toThrow();
  });

  it('entityTypeEnum exposes exactly person and pet', () => {
    expect(entityTypeEnum.options).toEqual(['person', 'pet']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/validation/__tests__/newPersonSchema.entity.test.ts`
Expected: FAIL — `entityTypeEnum` is not exported / `parsed.entityType` is `undefined`.

- [ ] **Step 3: Add the Zod schema additions**

In `lib/validation/schemas.ts`, after `export const importanceEnum = ...` (around line 16):

```ts
export const entityTypeEnum = z.enum(['person', 'pet']);
```

Inside `newPersonSchema` (the `z.object({ ... })` around line 36-49), add these two properties next to `personType`:

```ts
  entityType: entityTypeEnum.default('person'),
  species: z.string().trim().max(40, 'Species must be 40 characters or fewer').optional().nullable(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/validation/__tests__/newPersonSchema.entity.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the Drizzle schema columns**

In `lib/db/schema.ts`, in the `people` table, immediately after the line `languages: text('languages'), // JSON array of language strings`:

```ts
    entityType: text('entity_type', { enum: ['person', 'pet'] }).default('person'),
    species: text('species'),
```

In the same file, change the `connections` table's `relationshipType` enum to include `'pet'`:

```ts
    relationshipType: text('relationship_type', {
      enum: ['friend', 'family', 'colleague', 'partner', 'acquaintance', 'parent', 'child', 'sibling', 'pet'],
    }).notNull(),
```

- [ ] **Step 6: Add the runtime DB migration**

In `lib/db/index.ts`, inside the `CREATE TABLE IF NOT EXISTS people (` statement, add these two lines right after `languages TEXT,`:

```
        entity_type TEXT DEFAULT 'person',
        species TEXT,
```

Then, immediately after the `piiMigrations` `for` loop (the block that ends with the comment `// Column already exists` following the `phone/email/home_location/languages` array), add:

```ts
    // Migration: Add pet/child entity columns (see spec 2026-08-27-pet-and-child-connections)
    const entityMigrations = [
      "ALTER TABLE people ADD COLUMN entity_type TEXT DEFAULT 'person';",
      'ALTER TABLE people ADD COLUMN species TEXT;',
    ];
    for (const stmt of entityMigrations) {
      try {
        expoDb.execSync(stmt);
      } catch {
        // Column already exists
      }
    }
```

`connections.relationship_type` is already a plain `TEXT NOT NULL` column with no CHECK constraint, so `'pet'` needs no DB migration.

- [ ] **Step 7: Regenerate the drizzle-kit migration files (keep them in sync)**

Run: `npm run db:generate`
Expected: a new file `lib/db/migrations/0002_*.sql` adding `entity_type` and `species` to `people`. Commit it as-is; the runtime path in Step 6 is what actually applies on-device, but the repo keeps these generated files.

- [ ] **Step 8: Typecheck + full test run**

Run: `npm run typecheck && npx jest lib/validation`
Expected: typecheck clean; validation tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.ts lib/db/index.ts lib/validation/schemas.ts \
  lib/validation/__tests__/newPersonSchema.entity.test.ts lib/db/migrations/
git commit -m "feat(schema): add people.entityType/species and connections 'pet' type"
```

---

## Task 2: `usePeople` entityType filter

**Files:**
- Create: `lib/people/entityFilter.ts`
- Create: `lib/people/__tests__/entityFilter.test.ts`
- Modify: `hooks/usePeople.ts` (`usePeople` signature ~line 35; `queryKey` ~line 37; `whereConditions` build ~line 43-58)

**Interfaces:**
- Consumes: `people.entityType` column from Task 1.
- Produces:
  - `EntityTypeFilter` — type alias `'person' | 'pet' | 'all'`, exported from `lib/people/entityFilter.ts`
  - `entityConstraintFor(filter?: EntityTypeFilter): 'person' | 'pet' | null` — pure function; `null` means "no constraint", any other value means `WHERE entity_type = <value>`. `undefined` input returns `'person'`.
  - `usePeople(filter?: { type?: 'primary' | 'mentioned' | 'all'; entityType?: EntityTypeFilter })` — new optional `entityType` key; when omitted, results are people only.

- [ ] **Step 1: Write the failing test**

Create `lib/people/__tests__/entityFilter.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { entityConstraintFor } from '../entityFilter';

describe('entityConstraintFor', () => {
  it('defaults to "person" when filter is undefined', () => {
    expect(entityConstraintFor(undefined)).toBe('person');
  });

  it('returns "person" for explicit "person"', () => {
    expect(entityConstraintFor('person')).toBe('person');
  });

  it('returns "pet" for "pet"', () => {
    expect(entityConstraintFor('pet')).toBe('pet');
  });

  it('returns null (no constraint) for "all"', () => {
    expect(entityConstraintFor('all')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/people/__tests__/entityFilter.test.ts`
Expected: FAIL — `Cannot find module '../entityFilter'`.

- [ ] **Step 3: Implement the pure helper**

Create `lib/people/entityFilter.ts`:

```ts
/**
 * Which `people.entity_type` a people query should be constrained to.
 *
 * Pets share the `people` table but are opt-in: callers that don't ask get
 * people only, so pets never leak into the People tabs, counts, quizzes, or
 * party mode. Pass `'all'` to include both (used for connection lookups).
 */
export type EntityTypeFilter = 'person' | 'pet' | 'all';

export function entityConstraintFor(filter?: EntityTypeFilter): 'person' | 'pet' | null {
  if (filter === 'all') return null;
  if (filter === 'pet') return 'pet';
  return 'person';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/people/__tests__/entityFilter.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into `usePeople`**

In `hooks/usePeople.ts`:

Add to the imports at the top:

```ts
import { entityConstraintFor, type EntityTypeFilter } from '@/lib/people/entityFilter';
```

Change the `usePeople` signature and query key:

```ts
export function usePeople(filter?: {
  type?: 'primary' | 'mentioned' | 'all';
  entityType?: EntityTypeFilter;
}) {
  return useQuery<PersonWithPhoto[]>({
    queryKey: ['people', filter?.type || 'all', filter?.entityType || 'person'],
```

In the `queryFn`, after the existing `if (filter?.type === 'primary') { ... } else if (filter?.type === 'mentioned') { ... }` block and before `const peopleResults = ...`, add:

```ts
      const entityConstraint = entityConstraintFor(filter?.entityType);
      if (entityConstraint) {
        whereConditions.push(eq(people.entityType, entityConstraint));
      }
```

`eq` is already imported in this file.

- [ ] **Step 6: Typecheck + lint + test**

Run: `npm run typecheck && npm run lint && npx jest lib/people`
Expected: all clean. No other call site needs changes yet — every existing `usePeople(...)` call now implicitly filters to `entity_type = 'person'`, which is correct for all of them.

- [ ] **Step 7: Commit**

```bash
git add lib/people/entityFilter.ts lib/people/__tests__/entityFilter.test.ts hooks/usePeople.ts
git commit -m "feat(people): entityType filter on usePeople, defaults to person-only"
```

---

## Task 3: Person / Pet / Child add flow in the connection form

**Files:**
- Modify: `app/person/connection-form.tsx`
  - state block ~line 78-90
  - the "single person detailed mode" JSX branch ~line 545-700 (where `pendingPersonName` drives "Person Type" and "Relationship Type" `FormSection`s)
  - the create-person call inside `handleSubmit` ~line 312-320
  - the create-person call inside the multi-select submit path ~line 404-423
- Test: none (UI flow; verified manually on device — this repo does not unit-test screens)

**Interfaces:**
- Consumes: `newPersonSchema` entity fields (Task 1), `people.entityType`/`species` columns (Task 1), `connections.relationshipType = 'pet'` (Task 1).
- Produces: no exported symbols; behavioural contract only —
  - creating a "Pet" produces a `people` row `{ entityType: 'pet', personType: 'mentioned', species, dateOfBirth? }` and a `connections` row `{ relationshipType: 'pet', status }`.
  - creating a "Child" produces `{ entityType: 'person', personType: 'mentioned', dateOfBirth? }` and a `connections` row `{ relationshipType: 'child', status }`.

- [ ] **Step 1: Add state for the new entity kind**

In `app/person/connection-form.tsx`, in the form-state block (near `const [personType, setPersonType] = useState<'primary' | 'mentioned'>('primary');`), add:

```ts
  const [newEntityKind, setNewEntityKind] = useState<'person' | 'pet' | 'child'>('person');
  const [species, setSpecies] = useState('');
  const [birthdayText, setBirthdayText] = useState('');
```

Add this import near the other `lib/utils` imports:

```ts
import { parseFlexibleDate } from '@/lib/utils/dates';
```

- [ ] **Step 2: Reset the new fields where the form resets**

Find each place the form clears pending state after a successful submit (search for `setNotes('')` — there are three: around lines 234, 349, 445). Immediately after each `setNotes('');` add:

```ts
      setNewEntityKind('person');
      setSpecies('');
      setBirthdayText('');
```

- [ ] **Step 3: Render the Person / Pet / Child segmented control**

In the single-person detailed-mode branch, the block that currently starts with `{pendingPersonName && !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (` and renders the `<FormSection title="Person Type">`. Wrap the *new-entity* UI so it only shows when creating a new person (`pendingPersonName` truthy). Directly **above** that `FormSection title="Person Type"`, add:

```tsx
              {pendingPersonName && (
                <FormSection title="What are you adding?">
                  <View style={styles.pillRow}>
                    {(['person', 'pet', 'child'] as const).map((kind) => (
                      <Pill
                        key={kind}
                        label={kind === 'person' ? 'Person' : kind === 'pet' ? 'Pet' : 'Child'}
                        selected={newEntityKind === kind}
                        onPress={() => {
                          setNewEntityKind(kind);
                          if (kind === 'pet') {
                            setRelationshipType('pet' as ConnectionRelationshipType);
                            setPersonType('mentioned');
                          } else if (kind === 'child') {
                            setRelationshipType('child');
                            setPersonType('mentioned');
                          } else {
                            setRelationshipType('friend');
                            setPersonType('primary');
                          }
                        }}
                      />
                    ))}
                  </View>
                </FormSection>
              )}

              {pendingPersonName && newEntityKind === 'pet' && (
                <FormSection title="Species">
                  <FormInput
                    label="Species (e.g. Dog, Cat, Parrot)"
                    value={species}
                    onChangeText={setSpecies}
                    placeholder="Dog"
                  />
                </FormSection>
              )}

              {pendingPersonName && (newEntityKind === 'pet' || newEntityKind === 'child') && (
                <FormSection title="Birthday (optional)">
                  <FormInput
                    label="Birthday"
                    value={birthdayText}
                    onChangeText={setBirthdayText}
                    placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                  />
                </FormSection>
              )}
```

- [ ] **Step 4: Hide the Person Type + Relationship Type pickers for pet/child**

The existing `<FormSection title="Person Type">` block condition is:

```tsx
{pendingPersonName && !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
```

Change it to also require the default kind:

```tsx
{pendingPersonName && newEntityKind === 'person' && !ALWAYS_PRIMARY_RELATIONSHIPS.includes(relationshipType) && (
```

The following `<FormSection title="Relationship Type">` block renders the relationship-type pill row. Wrap its whole JSX in `{newEntityKind === 'person' && ( ... )}` (for pet/child the type is implied and already set in Step 3). Leave the `Qualifier` and `Notes` `FormInput`s outside that guard so they still render for all three kinds.

- [ ] **Step 5: Branch the create-person calls**

There are two `createPerson.mutateAsync({...})` calls. Replace the argument object in **both** with a shared builder. Add this helper inside the component, above `handleSubmit`:

```ts
  const buildNewPersonPayload = (name: string) => {
    const dob = birthdayText.trim() ? parseFlexibleDate(birthdayText.trim()) : null;
    if (newEntityKind === 'pet') {
      return {
        name,
        personType: 'mentioned' as const,
        entityType: 'pet' as const,
        species: species.trim() || null,
        dateOfBirth: dob ?? undefined,
      };
    }
    if (newEntityKind === 'child') {
      return {
        name,
        personType: 'mentioned' as const,
        entityType: 'person' as const,
        dateOfBirth: dob ?? undefined,
      };
    }
    return {
      name,
      personType,
      relationshipType: 'friend' as const,
    };
  };
```

Then in `handleSubmit`, replace:

```ts
           const newPerson = await createPerson.mutateAsync({
            name: pendingPersonName,
            personType: personType,
            relationshipType: 'friend', // Default
          });
```

with:

```ts
          const newPerson = await createPerson.mutateAsync(buildNewPersonPayload(pendingPersonName));
```

Do the equivalent replacement at the second `createPerson.mutateAsync` call in the multi-select submit path (it currently passes `{ name: ..., personType: personType }` around line 314-317 — use `buildNewPersonPayload(<that name>)` there too).

`createPerson` accepts `Omit<NewPerson, 'userId'>`, which already includes `entityType`, `species`, and `dateOfBirth` after Task 1, so no hook change is needed.

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. If TS complains that `'pet'` is not assignable to `ConnectionRelationshipType`, confirm Task 1 Step 5 added `'pet'` to the `connections` enum and that `ConnectionRelationshipType` is derived as `NonNullable<Connection['relationshipType']>` (it is, ~line 45) — a stale type cache; re-run.

- [ ] **Step 7: Manual verification on device**

Build & run (`cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease` then install), then:
1. Open any person → Connections section → `+` (Add Connection).
2. Search a name that doesn't exist → tap "Create new person and connect".
3. Confirm the "What are you adding?" pills show: Person / Pet / Child.
4. Tap **Pet** → Person Type and Relationship Type sections disappear; Species + Birthday sections appear.
5. Enter species "Dog", birthday "2019", submit → success alert, returns to profile.
6. Repeat with **Child** → only Birthday section shows; submit works.
7. Tap **Person** → original Person Type + Relationship Type sections come back.

- [ ] **Step 8: Commit**

```bash
git add app/person/connection-form.tsx
git commit -m "feat(connections): add Person/Pet/Child choice when creating a new connection"
```

---

## Task 4: Render pet & child connection rows

**Files:**
- Modify: `components/person/PersonConnections.tsx` (imports ~line 1-10; `usePeople()` call ~line 19; the `description` line + row JSX ~line 56-80; styles ~line 97-140)
- Test: none (UI; verified on device)

**Interfaces:**
- Consumes: `PersonWithPhoto.entityType` / `.species` (Task 1), `usePeople({ entityType: 'all' })` (Task 2), `connection.notes` (already present from earlier work this session).
- Produces: no exported symbols.

- [ ] **Step 1: Widen the lookup to include pets**

In `components/person/PersonConnections.tsx`, change:

```ts
  const { data: allPeople = [] } = usePeople();
```

to:

```ts
  const { data: allPeople = [] } = usePeople({ entityType: 'all' });
```

(Connections are already the filter — this only affects which rows can be resolved by id, and a pet connection *should* resolve.)

- [ ] **Step 2: Compute a per-row descriptor**

Replace the single `description` const inside `personConnections.map((connection) => { ... })`:

```ts
        const description = `${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`;
```

with:

```ts
        const isPet = connectedPerson.entityType === 'pet';
        const isChild = connection.relationshipType === 'child';
        const description = isPet
          ? `🐾 ${connectedPerson.species?.trim() || 'Pet'}`
          : isChild
            ? `Child${connection.qualifier ? ` • ${connection.qualifier}` : ''}`
            : `${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`;
```

- [ ] **Step 3: Hide the status pill for pets**

In the row JSX, the trailing `<Pill label={connection.status} variant="soft" />` — guard it:

```tsx
            {!isPet && <Pill label={connection.status} variant="soft" />}
```

- [ ] **Step 4: Typecheck + lint + existing tests**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: clean; 265+ tests pass.

- [ ] **Step 5: Manual verification on device**

1. Add a pet to a person (via Task 3 flow) → the Connections section shows a row with `🐾 Dog` and **no** status pill.
2. Add a child → row shows `Child` (plus qualifier if entered).
3. A normal friend/family connection row is unchanged (`friend • …` + status pill).
4. If the connection has notes, the italic notes line still shows under the descriptor.
5. Tap the pet row → routes to `/person/<petId>` (bare profile for now; Task 5 makes it tidy).

- [ ] **Step 6: Commit**

```bash
git add components/person/PersonConnections.tsx
git commit -m "feat(connections): render pet (🐾 species) and child rows"
```

---

## Task 5: Minimal pet profile + hide relation menu items

**Files:**
- Modify: `components/person/PersonHeader.tsx` (the returned JSX ~line 166-239; add one guard const near `hasChips` ~line 160)
- Modify: `app/person/[id].tsx` (the `<Menu>` items ~line 145-190 — the block added earlier this session that gates on `person.personType !== 'self'`)
- Test: none (UI; verified on device)

**Interfaces:**
- Consumes: `person.entityType` / `person.species` (Task 1).
- Produces: no exported symbols.

- [ ] **Step 1: Add a pet guard in `PersonHeader`**

In `components/person/PersonHeader.tsx`, near the existing `const hasChips = ...`:

```ts
  const isPet = person.entityType === 'pet';
```

- [ ] **Step 2: Render a species chip and skip N/A blocks for pets**

In the returned JSX:

- Replace the `{hasChips && ( <View style={styles.chips}> ... </View> )}` block's condition with `{!isPet && hasChips && ( ... )}`, and directly after it add:

```tsx
          {isPet && (
            <View style={styles.chips}>
              <Pill label={`🐾 ${person.species?.trim() || 'Pet'}`} variant="solid" />
            </View>
          )}
```

- Wrap the "Met" line block, the `<ContactQuickRow ... />` block, the `<SocialLinksStrip ... />` block, and the languages `{parseLanguagesJson(...).length > 0 && (...)}` block each in `{!isPet && ( ... )}`. Leave the avatar, name, nickname, `PartnerBadge`, and `{person.notes && <PersonNotes ... />}` untouched (they're fine for pets — `PartnerBadge` renders nothing when no partner connection resolves).

- [ ] **Step 3: Hide relation menu items for pets in `[id].tsx`**

In `app/person/[id].tsx`, the two `Menu.Item`s added earlier ("View Relationship", "Compare With…") and the "Add Relation" item are each gated on `person.personType !== 'self'`. Change those three guards to also exclude pets:

```tsx
{person.personType !== 'self' && person.entityType !== 'pet' && (
```

Leave "Change Photo", "Edit", and "Delete" available for pets.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 5: Manual verification on device**

1. Open a pet's profile (tap its row in a person's Connections).
2. Header shows: avatar, name, a single `🐾 Dog` chip. **No** "Met" line, no phone/email icons, no social strip, no languages.
3. Notes still render if the pet has any.
4. ⋮ menu shows Change Photo / Edit / Delete only — no View Relationship / Compare With… / Add Relation.
5. Important Dates section still works — add "Birthday 2019" and confirm it saves.
6. Open a normal person's profile → header and menu unchanged from before.

- [ ] **Step 6: Commit**

```bash
git add components/person/PersonHeader.tsx app/person/[id].tsx
git commit -m "feat(pets): minimal pet profile header, hide relation menu items"
```

---

## Final verification

- [ ] `npm run ci` (typecheck + lint + jest) is green.
- [ ] Fresh-install path: delete app data / reinstall → app boots, a new person has `entity_type = 'person'`.
- [ ] Upgrade path: install over the previous version → app boots, existing people unaffected, adding a pet works.
- [ ] People tab, "keep close" count, search, food quiz, party mode: pets do **not** appear.
- [ ] End-to-end: add pet "Rex" (Dog, 2019) to person A → shows as `🐾 Dog` on A → open Rex → minimal profile → add a second owner from Rex's own Connections section → Rex appears on person B too.

---

## Self-Review

**Spec coverage:**
- §1 Schema → Task 1 (columns, enum, migration, zod). ✅
- §2 `usePeople` filter + caller audit → Task 2 (helper + hook); `PersonConnections` lookup widened in Task 4 Step 1; `PartnerBadge` left default (correct). ✅
- §3 Add flow (Person/Pet/Child, species, birthday, save branching, multi-select untouched, no inline second parent) → Task 3. ✅
- §4 Display (`PersonConnections` rows, `PersonHeader` pet profile, `[id].tsx` menu) → Tasks 4 and 5. ✅
- §5 Entry points (segmented control is primary; ⋮ deep-link "nice-to-have") → Task 3 delivers the primary; the optional ⋮ deep-link is explicitly out and not planned. ✅
- Non-goals (second parent picker, Pets tab, vet reminders, breed/weight) → not planned. ✅

**Placeholder scan:** No TBD/TODO. Every code step has literal code. Manual-verification steps list concrete taps and expected results rather than "test it". ✅

**Type consistency:**
- `entityConstraintFor` / `EntityTypeFilter` — defined Task 2 Step 3, consumed Task 2 Step 5 with matching names. ✅
- `newEntityKind: 'person' | 'pet' | 'child'` — defined Task 3 Step 1, used consistently Steps 3-5. ✅
- `buildNewPersonPayload(name: string)` — defined Task 3 Step 5, called twice in the same step. ✅
- `isPet` — Task 4 Step 2 (row scope) and Task 5 Step 1 (`PersonHeader` scope) are separate local consts in separate files; not shared, no conflict. ✅
- `people.entityType` column vs `entity_type` DB name — Drizzle maps `entityType` ↔ `entity_type`; schema (Task 1 Step 5) and runtime SQL (Task 1 Step 6) use the right form for each context. ✅
